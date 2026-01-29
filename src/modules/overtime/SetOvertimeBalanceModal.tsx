// src/modules/overtime/SetOvertimeBalanceModal.tsx
import { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Select, Input, Typography, Space, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { api } from '../../lib/api';

type Role = { id: number; name: string; level: number };
type User = { id: number; name: string; email: string; managerId?: number | null; role?: Role };

function minutesToHHMM(min: number) {
  const sign = min < 0 ? '-' : '';
  const abs = Math.abs(min);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

// ✅ aceita negativo: -01:00
function parseHHMM(input: string): number | null {
  const v = (input || '').trim();
  const m = v.match(/^(-)?(\d{1,4}):([0-5]\d)$/);
  if (!m) return null;

  const sign = m[1] ? -1 : 1;
  const hh = Number(m[2]);
  const mm = Number(m[3]);
  return sign * (hh * 60 + mm);
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (changedUserId: number) => void;
  month: Dayjs;
  team: User[];
  defaultUserId?: number;
};

export default function SetOvertimeBalanceModal({
  open,
  onClose,
  onSuccess,
  month,
  team,
  defaultUserId,
}: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const monthStr = month.format('YYYY-MM');
  const selectedUserId = Form.useWatch('userId', form);

  const options = useMemo(() => team.map((u) => ({ label: u.name, value: u.id })), [team]);

  const [currentTotalMinutes, setCurrentTotalMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setCurrentTotalMinutes(null);

    if (defaultUserId) form.setFieldsValue({ userId: defaultUserId });
  }, [open, defaultUserId, form]);

  // Carrega saldo atual do usuário no mês
  useEffect(() => {
    const uid = selectedUserId;
    if (!open || !uid) return;

    (async () => {
      try {
        setCurrentTotalMinutes(null);
        const resp = await api.get(`/overtime/${uid}`, { params: { month: monthStr } });
        const cur = resp.data?.totalMinutes ?? 0;
        setCurrentTotalMinutes(cur);
        form.setFieldsValue({ desired: minutesToHHMM(cur) });
      } catch (err: any) {
        message.error(err?.response?.data?.message || 'Erro ao carregar saldo');
      }
    })();
  }, [open, selectedUserId, monthStr, form]);

  const computed = useMemo(() => {
    const desiredRaw = String(form.getFieldValue('desired') || '').trim();
    const desiredMinutes = parseHHMM(desiredRaw);
    if (desiredMinutes == null || currentTotalMinutes == null) return null;
    const diff = desiredMinutes - currentTotalMinutes;
    return { desiredMinutes, diff };
  }, [currentTotalMinutes, form, selectedUserId]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const userId = Number(values.userId);
    const desired = String(values.desired || '').trim();

    const desiredMinutes = parseHHMM(desired);
    if (desiredMinutes == null) return message.error('Use HH:MM ou -HH:MM (ex.: 11:32 ou -01:00)');
    if (currentTotalMinutes == null) return message.error('Aguarde carregar o saldo atual');

    const diff = desiredMinutes - currentTotalMinutes;
    if (diff === 0) return message.info('Saldo já está nesse valor');

    setLoading(true);
    try {
      // você pode trocar pra último dia do mês se preferir
      const date = dayjs().format('YYYY-MM-DD');

      const note = `Alteração de saldo: ${minutesToHHMM(currentTotalMinutes)} → ${minutesToHHMM(desiredMinutes)}`;

      await api.post('/overtime/adjust', {
        userId,
        date,
        minutes: diff,
        note,
      });

      message.success('Banco de horas atualizado');
      onSuccess(userId);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Atualizar banco de horas"
      onCancel={onClose}
      onOk={handleOk}
      okText="Salvar"
      cancelText="Cancelar"
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="userId" label="Técnico" rules={[{ required: true, message: 'Selecione um técnico' }]}>
          <Select showSearch placeholder="Selecione um técnico" options={options} optionFilterProp="label" />
        </Form.Item>

        <Form.Item
          name="desired"
          label="Saldo final desejado (HH:MM)"
          rules={[
            { required: true, message: 'Informe o saldo final (ex.: 11:32 ou -01:00)' },
            {
              validator: async (_, value) => {
                if (parseHHMM(String(value || '').trim()) == null) {
                  throw new Error('Formato inválido. Use HH:MM ou -HH:MM (ex.: 11:32 ou -01:00)');
                }
              },
            },
          ]}
        >
          <Input placeholder="Ex.: 11:32 ou -01:00" />
        </Form.Item>

        <Space direction="vertical" style={{ width: '100%' }} size={4}>
          <Typography.Text type="secondary">
            Mês: <b>{month.format('MMMM [de] YYYY')}</b>
          </Typography.Text>

          <Typography.Text type="secondary">
            Saldo atual:{' '}
            <b>{currentTotalMinutes == null ? 'Carregando...' : minutesToHHMM(currentTotalMinutes)}</b>
          </Typography.Text>

          {computed && (
            <Typography.Text type="secondary">
              Ajuste aplicado:{' '}
              <b style={{ color: computed.diff >= 0 ? '#16a34a' : '#dc2626' }}>
                {computed.diff >= 0 ? '+' : '-'}
                {minutesToHHMM(Math.abs(computed.diff))}
              </b>
            </Typography.Text>
          )}
        </Space>
      </Form>
    </Modal>
  );
}
