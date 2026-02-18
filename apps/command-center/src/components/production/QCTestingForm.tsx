'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitQCTest } from '@/app/actions/production';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface QCTestingFormProps {
  batchId: string;
  batchStatus: string;
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? 'Submitting...' : children}
    </Button>
  );
}

export function QCTestingForm({ batchId, batchStatus }: QCTestingFormProps) {
  const [phState, phAction] = useActionState(submitQCTest, undefined);
  const [visualState, visualAction] = useActionState(submitQCTest, undefined);

  const isDisabled = batchStatus === 'RELEASED';
  const isOnHold = batchStatus === 'HOLD';

  // Calculate pH status color
  const getPhStatus = (phLevel: number) => {
    if (phLevel >= 4.6) return { color: 'text-red-600', label: 'Unsafe - Will Fail' };
    if (phLevel <= 3.8 && phLevel >= 3.4) return { color: 'text-green-600', label: 'Target Range' };
    if (phLevel < 4.6) return { color: 'text-yellow-600', label: 'Safe but Outside Target' };
    return { color: 'text-muted-foreground', label: '' };
  };

  return (
    <div className="space-y-6">
      {isOnHold && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <strong>Batch on HOLD</strong>
          </div>
          <p className="mt-1">This batch failed QC testing. Re-test to update status.</p>
        </div>
      )}

      {isDisabled && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <strong>Batch Released</strong>
          </div>
          <p className="mt-1">QC testing is complete. This batch has been released.</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* pH Test Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">pH Test</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={phAction} className="space-y-4">
              <input type="hidden" name="batchId" value={batchId} />
              <input type="hidden" name="testType" value="pH" />

              <div className="space-y-2">
                <label htmlFor="phLevel" className="text-sm font-medium">
                  pH Level
                </label>
                <Input
                  id="phLevel"
                  name="phLevel"
                  type="number"
                  step="0.1"
                  min="0"
                  max="14"
                  inputMode="decimal"
                  placeholder="e.g., 3.6"
                  className="text-base h-11"
                  disabled={isDisabled}
                  required
                  onInput={(e) => {
                    const input = e.target as HTMLInputElement;
                    const value = parseFloat(input.value);
                    const statusEl = document.getElementById('ph-status');
                    if (statusEl && !isNaN(value)) {
                      const status = getPhStatus(value);
                      statusEl.className = `text-sm font-medium ${status.color}`;
                      statusEl.textContent = status.label;
                    }
                  }}
                />
                <div id="ph-status" className="text-sm text-muted-foreground"></div>
                <p className="text-xs text-muted-foreground">
                  Target: 3.4-3.8 (must be {'<'} 4.6 for food safety)
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="phNotes" className="text-sm font-medium">
                  Notes (Optional)
                </label>
                <textarea
                  id="phNotes"
                  name="notes"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  disabled={isDisabled}
                />
              </div>

              {phState?.message && (
                <div
                  className={`text-sm ${
                    phState.success ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {phState.message}
                </div>
              )}

              <SubmitButton>Record pH Test</SubmitButton>
            </form>
          </CardContent>
        </Card>

        {/* Visual/Taste Test Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Visual & Taste Test</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={visualAction} className="space-y-4">
              <input type="hidden" name="batchId" value={batchId} />
              <input type="hidden" name="testType" value="visual_taste" />

              <div className="space-y-2">
                <label className="text-sm font-medium">Result</label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 border-green-500 hover:bg-green-50 dark:hover:bg-green-950 data-[selected=true]:bg-green-500 data-[selected=true]:text-white"
                    disabled={isDisabled}
                    onClick={(e) => {
                      const form = e.currentTarget.form;
                      if (form) {
                        const input = form.querySelector('input[name="passed"]') as HTMLInputElement;
                        if (input) input.value = 'true';
                        e.currentTarget.setAttribute('data-selected', 'true');
                        const failBtn = form.querySelector('button[type="button"]:last-of-type');
                        failBtn?.setAttribute('data-selected', 'false');
                      }
                    }}
                  >
                    Pass
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 border-red-500 hover:bg-red-50 dark:hover:bg-red-950 data-[selected=true]:bg-red-500 data-[selected=true]:text-white"
                    disabled={isDisabled}
                    onClick={(e) => {
                      const form = e.currentTarget.form;
                      if (form) {
                        const input = form.querySelector('input[name="passed"]') as HTMLInputElement;
                        if (input) input.value = 'false';
                        e.currentTarget.setAttribute('data-selected', 'true');
                        const passBtn = form.querySelector('button[type="button"]:first-of-type');
                        passBtn?.setAttribute('data-selected', 'false');
                      }
                    }}
                  >
                    Fail
                  </Button>
                </div>
                <input type="hidden" name="passed" required />
              </div>

              <div className="space-y-2">
                <label htmlFor="visualNotes" className="text-sm font-medium">
                  Notes
                </label>
                <textarea
                  id="visualNotes"
                  name="notes"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  placeholder="Required if test fails"
                  disabled={isDisabled}
                />
              </div>

              {visualState?.message && (
                <div
                  className={`text-sm ${
                    visualState.success ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {visualState.message}
                </div>
              )}

              <SubmitButton>Record Visual/Taste Test</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
