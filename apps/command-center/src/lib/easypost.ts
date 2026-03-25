import EasyPostClient from '@easypost/api';

// Singleton pattern — safe for server actions (server-only module)
let _client: InstanceType<typeof EasyPostClient> | null = null;

function getClient(): InstanceType<typeof EasyPostClient> {
  const apiKey = process.env.EASYPOST_API_KEY;
  if (!apiKey) throw new Error('EASYPOST_API_KEY must be set');
  if (!_client) _client = new EasyPostClient(apiKey);
  return _client;
}

export interface CreateShipmentParams {
  shipFrom: {
    name: string;
    street1: string;
    city: string;
    state: string;
    zip: string;
  };
  shipTo: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
    phone?: string;
  };
  packageWeightLbs: number;   // Stored in DB as lbs — converted to oz here
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  carrier: 'UPS' | 'USPS';   // Filter rates by carrier
}

export interface ShipmentResult {
  easypostShipmentId: string;  // shp_... — store on Shipment for refunds
  trackingNumber: string;
  labelData: string;           // base64 PNG — preserved for existing UI pattern
  labelFormat: string;
  carrier: string;
  shippingCost: number;
}

export async function createEasyPostShipment(
  params: CreateShipmentParams
): Promise<ShipmentResult> {
  const ep = getClient();

  const shipment = await ep.Shipment.create({
    from_address: {
      name: params.shipFrom.name,
      street1: params.shipFrom.street1,
      city: params.shipFrom.city,
      state: params.shipFrom.state,
      zip: params.shipFrom.zip,
      country: 'US',
    },
    to_address: {
      name: params.shipTo.name,
      street1: params.shipTo.addressLine1,
      street2: params.shipTo.addressLine2 || undefined,
      city: params.shipTo.city,
      state: params.shipTo.state,
      zip: params.shipTo.zip,
      country: params.shipTo.country || 'US',
      phone: params.shipTo.phone || undefined,
    },
    parcel: {
      weight: params.packageWeightLbs * 16,  // CRITICAL: DB stores lbs, EasyPost requires oz
      length: params.dimensions?.length,
      width: params.dimensions?.width,
      height: params.dimensions?.height,
    },
  });

  // lowestRate([carrier]) filters to carrier then returns cheapest service
  const rate = shipment.lowestRate([params.carrier]);
  const bought = await ep.Shipment.buy(shipment.id, rate);

  // Fetch label URL and convert to base64 — preserves existing Shipment.labelData column pattern
  // (EasyPost label URLs expire after 180 days; storing base64 in DB avoids broken images)
  const labelResponse = await fetch(bought.postage_label.label_url);
  const labelBuffer = await labelResponse.arrayBuffer();
  const labelBase64 = Buffer.from(labelBuffer).toString('base64');

  return {
    easypostShipmentId: bought.id,
    trackingNumber: bought.tracking_code,
    labelData: labelBase64,
    labelFormat: 'PNG',
    carrier: bought.selected_rate?.carrier ?? params.carrier,
    shippingCost: parseFloat(bought.selected_rate?.rate ?? '0'),
  };
}

export async function refundEasyPostShipment(
  easypostShipmentId: string
): Promise<boolean> {
  const ep = getClient();
  await ep.Shipment.refund(easypostShipmentId);
  return true;
}
