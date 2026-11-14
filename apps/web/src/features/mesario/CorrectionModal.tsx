import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { CORRECTION_REASON, correctionError } from '@copa/shared';
import { Button, Field, Input, Modal, Select, Textarea } from '@/shared/ui';

export interface CorrectionRequest {
  title: string;
  description: string;
  confirmLabel: string;
  askMinute?: { minute: number; period: 1 | 2; max: number };
  run: (reason: string, at?: { minute: number; period: 1 | 2 }) => Promise<unknown> | void;
}

export function CorrectionModal({ request, onClose }: { request: CorrectionRequest | null; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [minute, setMinute] = useState('');
  const [period, setPeriod] = useState<1 | 2>(1);
  const ask = request?.askMinute;
  useEffect(() => {
    if (!ask) return;
    setMinute(String(ask.minute));
    setPeriod(ask.period);
  }, [ask]);
  const minuteValue = Number(minute);
  const minuteError = ask && (!Number.isInteger(minuteValue) || minuteValue < 0 || minuteValue > ask.max + 10) ? `Minuto entre 0 e ${ask.max + 10}.` : null;
  const error = correctionError(reason) ?? minuteError;

  const close = () => {
    setReason('');
    setTouched(false);
    onClose();
  };

  const confirm = async () => {
    setTouched(true);
    if (!request || error) return;
    setBusy(true);
    try {
      await request.run(reason.trim(), ask ? { minute: minuteValue, period } : undefined);
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(request)} onClose={close} title={request?.title}>
      <div className="mb-4 flex gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
        <ShieldAlert className="size-5 shrink-0" />
        <p>{request?.description} O motivo fica registrado com o seu nome e o horário.</p>
      </div>
      {ask && (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <Field label="Tempo">
            <Select value={period} onChange={(e) => setPeriod(Number(e.target.value) as 1 | 2)}>
              <option value={1}>1º tempo</option>
              <option value={2}>2º tempo</option>
            </Select>
          </Field>
          <Field label="Minuto do lance">
            <Input type="number" min={0} max={ask.max + 10} value={minute} onChange={(e) => setMinute(e.target.value)} />
          </Field>
        </div>
      )}
      <Field label="Justificativa" hint={`${reason.trim().length}/${CORRECTION_REASON.max} · mínimo ${CORRECTION_REASON.min} caracteres`}>
        <Textarea
          autoFocus
          rows={3}
          maxLength={CORRECTION_REASON.max}
          value={reason}
          placeholder="Ex.: súmula do árbitro aponta gol do camisa 10 aos 18' que não foi lançado"
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
        />
      </Field>
      {touched && error && <p className="mt-2 text-xs font-semibold text-red-300">{error}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={close}>Cancelar</Button>
        <Button variant="danger" loading={busy} disabled={Boolean(error)} onClick={confirm}>{request?.confirmLabel ?? 'Confirmar'}</Button>
      </div>
    </Modal>
  );
}
