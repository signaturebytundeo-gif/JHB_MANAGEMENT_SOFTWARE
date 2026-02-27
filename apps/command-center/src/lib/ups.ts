const UPS_BASE_URL = process.env.UPS_SANDBOX === 'true'
  ? 'https://wwwcie.ups.com'
  : 'https://onlinetools.ups.com';

let cachedToken: { token: string; expiresAt: number } | null = null;

/** Get OAuth 2.0 access token from UPS (client credentials flow) */
async function getUPSToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const clientId = process.env.UPS_CLIENT_ID;
  const clientSecret = process.env.UPS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('UPS_CLIENT_ID and UPS_CLIENT_SECRET must be set');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${UPS_BASE_URL}/security/v1/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`UPS OAuth failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  return cachedToken.token;
}

/** Build UPS address object from Location address string */
function parseLocationAddress(address: string, name: string) {
  // Address format: "123 Street, City, ST 12345" or similar
  const parts = address.split(',').map((p: string) => p.trim());

  if (parts.length >= 3) {
    const streetAddress = parts[0];
    const city = parts[1];
    const stateZipParts = parts[2].trim().split(/\s+/);
    const stateCode = stateZipParts[0] || '';
    const postalCode = stateZipParts[1] || '';

    return {
      Name: { Number: '', Description: name },
      Address: {
        AddressLine: [streetAddress],
        City: city,
        StateProvinceCode: stateCode,
        PostalCode: postalCode,
        CountryCode: 'US',
      },
    };
  }

  // Fallback: use the whole string as address line
  return {
    Name: { Number: '', Description: name },
    Address: {
      AddressLine: [address],
      City: '',
      StateProvinceCode: '',
      PostalCode: '',
      CountryCode: 'US',
    },
  };
}

export interface CreateShipmentParams {
  shipFrom: { name: string; address: string; phone?: string };
  shipTo: {
    name: string;
    phone?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  packageWeight: number; // lbs
  packageDimensions?: { length: number; width: number; height: number };
  serviceCode: string;
}

export interface CreateShipmentResult {
  trackingNumber: string;
  labelData: string; // base64 PNG
  labelFormat: string;
  shippingCost: number;
}

/** Create a shipment and get a label from UPS */
export async function createUPSShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
  const token = await getUPSToken();
  const accountNumber = process.env.UPS_ACCOUNT_NUMBER;

  if (!accountNumber) {
    throw new Error('UPS_ACCOUNT_NUMBER must be set');
  }

  const shipperAddress = parseLocationAddress(params.shipFrom.address, params.shipFrom.name);

  const packageObj: Record<string, unknown> = {
    Packaging: { Code: '02', Description: 'Customer Supplied Package' },
    PackageWeight: {
      UnitOfMeasurement: { Code: 'LBS', Description: 'Pounds' },
      Weight: params.packageWeight.toFixed(1),
    },
  };

  if (params.packageDimensions) {
    packageObj.Dimensions = {
      UnitOfMeasurement: { Code: 'IN', Description: 'Inches' },
      Length: params.packageDimensions.length.toFixed(1),
      Width: params.packageDimensions.width.toFixed(1),
      Height: params.packageDimensions.height.toFixed(1),
    };
  }

  const shipmentRequest = {
    ShipmentRequest: {
      Request: {
        SubVersion: '2403',
        RequestOption: 'nonvalidate',
        TransactionReference: { CustomerContext: 'JHB Command Center' },
      },
      Shipment: {
        Description: 'Jamaica House Brand Products',
        Shipper: {
          Name: params.shipFrom.name,
          ShipperNumber: accountNumber,
          Phone: params.shipFrom.phone ? { Number: params.shipFrom.phone } : undefined,
          Address: shipperAddress.Address,
        },
        ShipTo: {
          Name: params.shipTo.name,
          Phone: params.shipTo.phone ? { Number: params.shipTo.phone } : undefined,
          Address: {
            AddressLine: [
              params.shipTo.addressLine1,
              ...(params.shipTo.addressLine2 ? [params.shipTo.addressLine2] : []),
            ],
            City: params.shipTo.city,
            StateProvinceCode: params.shipTo.state,
            PostalCode: params.shipTo.zip,
            CountryCode: params.shipTo.country || 'US',
          },
        },
        ShipFrom: {
          Name: params.shipFrom.name,
          Phone: params.shipFrom.phone ? { Number: params.shipFrom.phone } : undefined,
          Address: shipperAddress.Address,
        },
        PaymentInformation: {
          ShipmentCharge: [
            {
              Type: '01',
              BillShipper: { AccountNumber: accountNumber },
            },
          ],
        },
        Service: {
          Code: params.serviceCode,
          Description: getServiceDescription(params.serviceCode),
        },
        Package: packageObj,
      },
      LabelSpecification: {
        LabelImageFormat: { Code: 'PNG', Description: 'PNG' },
        LabelStockSize: { Height: '6', Width: '4' },
      },
    },
  };

  const response = await fetch(`${UPS_BASE_URL}/api/shipments/v2403/ship`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'transId': `jhb-${Date.now()}`,
      'transactionSrc': 'JHB Command Center',
    },
    body: JSON.stringify(shipmentRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`UPS Shipment creation failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const shipmentResponse = result.ShipmentResponse;
  const packageResults = shipmentResponse.ShipmentResults;

  const trackingNumber = packageResults.PackageResults?.TrackingNumber
    || packageResults.PackageResults?.[0]?.TrackingNumber
    || '';

  const labelImage = packageResults.PackageResults?.ShippingLabel?.GraphicImage
    || packageResults.PackageResults?.[0]?.ShippingLabel?.GraphicImage
    || '';

  const totalCharges = packageResults.ShipmentCharges?.TotalCharges?.MonetaryValue || '0';

  return {
    trackingNumber,
    labelData: labelImage,
    labelFormat: 'PNG',
    shippingCost: parseFloat(totalCharges),
  };
}

/** Void a UPS shipment */
export async function voidUPSShipment(trackingNumber: string): Promise<boolean> {
  const token = await getUPSToken();

  const response = await fetch(
    `${UPS_BASE_URL}/api/shipments/v2403/void/cancel/${trackingNumber}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'transId': `jhb-void-${Date.now()}`,
        'transactionSrc': 'JHB Command Center',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`UPS Void failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result.VoidShipmentResponse?.SummaryResult?.Status?.Type === '1';
}

/** Track a UPS shipment */
export async function trackUPSShipment(trackingNumber: string): Promise<{
  status: string;
  statusDescription: string;
  deliveryDate?: string;
}> {
  const token = await getUPSToken();

  const response = await fetch(
    `${UPS_BASE_URL}/api/track/v1/details/${trackingNumber}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'transId': `jhb-track-${Date.now()}`,
        'transactionSrc': 'JHB Command Center',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`UPS Tracking failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const trackDetail = result.trackResponse?.shipment?.[0]?.package?.[0];
  const currentStatus = trackDetail?.currentStatus;

  return {
    status: currentStatus?.code || 'UNKNOWN',
    statusDescription: currentStatus?.description || 'Unknown',
    deliveryDate: trackDetail?.deliveryDate?.date,
  };
}

/** Validate an address using UPS */
export async function validateUPSAddress(address: {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}): Promise<{ valid: boolean; suggestion?: string }> {
  const token = await getUPSToken();

  const requestBody = {
    XAVRequest: {
      AddressKeyFormat: {
        AddressLine: [
          address.addressLine1,
          ...(address.addressLine2 ? [address.addressLine2] : []),
        ],
        PoliticalDivision2: address.city,
        PoliticalDivision1: address.state,
        PostcodePrimaryLow: address.zip,
        CountryCode: address.country || 'US',
      },
    },
  };

  const response = await fetch(
    `${UPS_BASE_URL}/api/addressvalidation/v2/3`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'transId': `jhb-addr-${Date.now()}`,
        'transactionSrc': 'JHB Command Center',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    // Address validation is non-critical; don't block shipment on failure
    console.warn('UPS Address Validation failed, proceeding without validation');
    return { valid: true };
  }

  const result = await response.json();
  const xavResponse = result.XAVResponse;

  if (xavResponse?.ValidAddressIndicator !== undefined) {
    return { valid: true };
  }

  if (xavResponse?.AmbiguousAddressIndicator !== undefined) {
    const candidate = xavResponse?.Candidate?.[0]?.AddressKeyFormat;
    if (candidate) {
      const suggestion = [
        candidate.AddressLine?.[0],
        candidate.PoliticalDivision2,
        `${candidate.PoliticalDivision1} ${candidate.PostcodePrimaryLow}`,
      ]
        .filter(Boolean)
        .join(', ');
      return { valid: false, suggestion };
    }
  }

  return { valid: true };
}

function getServiceDescription(code: string): string {
  const services: Record<string, string> = {
    '01': 'UPS Next Day Air',
    '02': 'UPS 2nd Day Air',
    '03': 'UPS Ground',
    '12': 'UPS 3 Day Select',
    '13': 'UPS Next Day Air Saver',
    '14': 'UPS Next Day Air Early',
    '59': 'UPS 2nd Day Air A.M.',
  };
  return services[code] || 'UPS Ground';
}

export const UPS_SERVICES = [
  { code: '03', name: 'UPS Ground' },
  { code: '12', name: 'UPS 3 Day Select' },
  { code: '02', name: 'UPS 2nd Day Air' },
  { code: '01', name: 'UPS Next Day Air' },
  { code: '13', name: 'UPS Next Day Air Saver' },
];
