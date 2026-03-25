import React from 'react';
import { Card, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import type { DeliveryReport, FormValues, ImportStage } from './deliveryReportsTypes';

const { Text } = Typography;

export const STATUS_ENTREGA_OPTIONS = [
  'PENDENTE',
  'EM TRANSITO',
  'EM ROTA',
  'NO PRAZO',
  'FORA DO PRAZO',
  'ENTREGUE',
  'ATRASADA',
  'DEVOLVIDA',
  'CANCELADA',
];

export const OPERACAO_OPTIONS = [
  'TRANSFERENCIA',
  'ENTREGA',
  'COLETA',
  'REDESPACHO',
  'DEVOLUCAO',
];

export const REGIAO_OPTIONS = ['NORTE', 'NORDESTE', 'CENTRO-OESTE', 'SUDESTE', 'SUL'];
export const MODAL_OPTIONS = ['RODOVIARIO', 'AEREO', 'MARITIMO', 'FERROVIARIO'];

export function formatDate(value?: string | null) {
  if (!value) return '-';
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY') : '-';
}

export function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY HH:mm:ss') : '-';
}

export function toFormDate(value?: string | null) {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? d : null;
}

export function normalizeCurrency(value?: number | string | null) {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function formatMoney(value?: number | string | null) {
  return normalizeCurrency(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatNumber(value?: number | string | null, digits = 2) {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatIdentifier(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value).replace(/,/g, '');
}

export function formatCompactMoney(value?: number | string | null) {
  const num = normalizeCurrency(value);

  if (Math.abs(num) >= 1_000_000) {
    return `${(num / 1_000_000).toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    })} Mi`;
  }

  if (Math.abs(num) >= 1_000) {
    return `${(num / 1_000).toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    })} Mil`;
  }

  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatPercent(value?: number | null, digits = 1) {
  const num = Number(value || 0);
  return `${num.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function getMonthLabel(monthIndex: number) {
  const months = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  return months[monthIndex] || '-';
}

export function normalizeModal(value?: string | null) {
  const v = String(value || '').trim().toUpperCase();
  if (!v) return 'NÃO INFORMADO';
  if (v.includes('AERE')) return 'Aéreo';
  if (v.includes('RODO')) return 'Rodoviário';
  if (v.includes('MARIT')) return 'Marítimo';
  if (v.includes('FERRO')) return 'Ferroviário';
  return value || 'NÃO INFORMADO';
}

export function normalizeOperationLabel(value?: string | null) {
  const v = String(value || '').trim().toUpperCase();

  if (!v) return 'OUTROS';
  if (v.includes('VENDA')) return 'VENDA';
  if (v.includes('REVERSA PRESTADOR')) return 'REVERSA PRESTADOR';
  if (v.includes('REVERSA')) return 'REVERSA';
  if (v.includes('COMODATO')) return 'COMODATO';
  if (v.includes('ARMAZ')) return 'AVANÇO DE ESTOQUE ARMAZÉM';
  if (v.includes('TECN')) return 'AVANÇO DE ESTOQUE TÉCNICO';
  if (v.includes('AVAN')) return 'AVANÇO DE ESTOQUE';
  return v;
}

export function resolveStatusEntrega(record: DeliveryReport) {
  const statusManual = String(record.statusEntrega || '').trim().toUpperCase();
  const previsao = record.previsaoEntrega ? dayjs(record.previsaoEntrega).startOf('day') : null;
  const entrega = record.dataEntrega ? dayjs(record.dataEntrega).startOf('day') : null;
  const hoje = dayjs().startOf('day');

  if (statusManual.includes('CANCEL')) return 'CANCELADA';
  if (statusManual.includes('DEVOL')) return 'DEVOLVIDA';
  if (statusManual.includes('TRANS')) return 'EM TRANSITO';
  if (statusManual.includes('ROTA')) return 'EM ROTA';
  if (statusManual.includes('PEND')) return 'PENDENTE';

  if (previsao && entrega) {
    return entrega.isAfter(previsao) ? 'FORA DO PRAZO' : 'NO PRAZO';
  }

  if (previsao && !entrega) {
    return hoje.isAfter(previsao) ? 'FORA DO PRAZO' : 'NO PRAZO';
  }

  if (statusManual.includes('NO PRAZO')) return 'NO PRAZO';
  if (statusManual.includes('FORA DO PRAZO')) return 'FORA DO PRAZO';
  if (statusManual.includes('ATRAS')) return 'FORA DO PRAZO';
  if (statusManual.includes('ENTREG')) return 'ENTREGUE';

  return statusManual || 'PENDENTE';
}

export function normalizeStatusBucket(value?: string | null, record?: DeliveryReport) {
  const v = record ? resolveStatusEntrega(record) : String(value || '').trim().toUpperCase();

  if (v.includes('NO PRAZO')) return 'No Prazo';
  if (v.includes('FORA DO PRAZO') || v.includes('ATRAS')) return 'Fora do Prazo';
  if (v.includes('ENTREG')) return 'Entregue';
  if (v.includes('ROTA')) return 'Em rota';
  if (v.includes('TRANS')) return 'Em andamento';
  if (v.includes('PEND')) return 'Pendente';
  if (v.includes('CANCEL')) return 'Cancelada';
  if (v.includes('DEVOL')) return 'Devolvida';
  return value || 'Não informado';
}

export function getRecordDate(record: DeliveryReport) {
  const raw = record.emissaoData || record.emissao;
  const d = dayjs(raw);
  return d.isValid() ? d : null;
}

export function cleanObject<T extends Record<string, any>>(obj: T) {
  const out: Record<string, any> = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      out[key] = value;
    }
  });
  return out as T;
}

export function mapFormToPayload(values: FormValues) {
  return cleanObject({
    cte: values.cte?.trim(),
    tipo: values.tipo?.trim(),
    emissao: values.emissao ? values.emissao.toISOString() : undefined,
    cidadeOrigem: values.cidadeOrigem?.trim(),
    ufOrigem: values.ufOrigem?.trim().toUpperCase(),
    remetente: values.remetente?.trim(),
    cidadeDestino: values.cidadeDestino?.trim(),
    ufDestino: values.ufDestino?.trim().toUpperCase(),
    destinatario: values.destinatario?.trim(),
    notaFiscal: values.notaFiscal?.trim(),
    nfValor: values.nfValor,
    pesoReal: values.pesoReal,
    pesoCubado: values.pesoCubado,
    pesoTaxado: values.pesoTaxado,
    volume: values.volume,
    frete: values.frete,
    icmsPercent: values.icmsPercent,
    icmsValor: values.icmsValor,
    status: values.status?.trim(),
    previsaoEntrega: values.previsaoEntrega ? values.previsaoEntrega.toISOString() : undefined,
    dataEntrega: values.dataEntrega ? values.dataEntrega.toISOString() : undefined,
    modal: values.modal?.trim(),
    statusEntrega: values.statusEntrega?.trim().toUpperCase(),
    operacao: values.operacao?.trim(),
    operacaoResumo: values.operacaoResumo?.trim(),
    cteNovo: values.cteNovo?.trim(),
    emissaoData: values.emissaoData ? values.emissaoData.toISOString() : undefined,
    transportadora: values.transportadora?.trim(),
    encomenda: values.encomenda?.trim(),
    reentregaDevolucao: values.reentregaDevolucao?.trim(),
    ultimaAtualizacao: values.ultimaAtualizacao ? values.ultimaAtualizacao.toISOString() : undefined,
    indice: values.indice,
    regiao: values.regiao?.trim(),
    comments: values.comments?.trim(),
  });
}

export function mapRecordToFormValues(record: DeliveryReport): FormValues {
  return {
    cte: record.cte || undefined,
    tipo: record.tipo || undefined,
    emissao: toFormDate(record.emissao),
    cidadeOrigem: record.cidadeOrigem || undefined,
    ufOrigem: record.ufOrigem || undefined,
    remetente: record.remetente || undefined,
    cidadeDestino: record.cidadeDestino || undefined,
    ufDestino: record.ufDestino || undefined,
    destinatario: record.destinatario || undefined,
    notaFiscal: record.notaFiscal || undefined,
    nfValor: record.nfValor !== null && record.nfValor !== undefined ? Number(record.nfValor) : null,
    pesoReal: record.pesoReal !== null && record.pesoReal !== undefined ? Number(record.pesoReal) : null,
    pesoCubado: record.pesoCubado !== null && record.pesoCubado !== undefined ? Number(record.pesoCubado) : null,
    pesoTaxado: record.pesoTaxado !== null && record.pesoTaxado !== undefined ? Number(record.pesoTaxado) : null,
    volume: record.volume !== null && record.volume !== undefined ? Number(record.volume) : null,
    frete: record.frete !== null && record.frete !== undefined ? Number(record.frete) : null,
    icmsPercent: record.icmsPercent !== null && record.icmsPercent !== undefined ? Number(record.icmsPercent) : null,
    icmsValor: record.icmsValor !== null && record.icmsValor !== undefined ? Number(record.icmsValor) : null,
    status: record.status || undefined,
    previsaoEntrega: toFormDate(record.previsaoEntrega),
    dataEntrega: toFormDate(record.dataEntrega),
    modal: record.modal || undefined,
    statusEntrega: resolveStatusEntrega(record),
    operacao: record.operacao || undefined,
    operacaoResumo: record.operacaoResumo || undefined,
    cteNovo: record.cteNovo || undefined,
    emissaoData: toFormDate(record.emissaoData),
    transportadora: record.transportadora || undefined,
    encomenda: record.encomenda || undefined,
    reentregaDevolucao: record.reentregaDevolucao || undefined,
    ultimaAtualizacao: toFormDate(record.ultimaAtualizacao),
    indice: record.indice ?? null,
    regiao: record.regiao || undefined,
    comments: undefined,
  };
}

export function statusEntregaTag(status?: string | null, record?: DeliveryReport) {
  const resolved = record ? resolveStatusEntrega(record) : String(status || '').trim().toUpperCase();

  if (!resolved) return <Tag>-</Tag>;
  if (resolved.includes('CANCEL')) return <Tag color="red">Cancelada</Tag>;
  if (resolved.includes('DEVOL')) return <Tag color="gold">Devolvida</Tag>;
  if (resolved.includes('FORA DO PRAZO') || resolved.includes('ATRAS')) {
    return <Tag color="red">Fora do Prazo</Tag>;
  }
  if (resolved.includes('NO PRAZO')) return <Tag color="green">No Prazo</Tag>;
  if (resolved.includes('TRANS')) return <Tag color="blue">Em Trânsito</Tag>;
  if (resolved.includes('ROTA')) return <Tag color="cyan">Em Rota</Tag>;
  if (resolved.includes('PEND')) return <Tag>Pendente</Tag>;
  if (resolved.includes('ENTREG')) return <Tag color="green">Entregue</Tag>;

  return <Tag>{resolved}</Tag>;
}

export function actionTag(actionType?: string | null) {
  const action = String(actionType || '').toUpperCase();
  if (action === 'CREATED') return <Tag color="green">Criado</Tag>;
  if (action === 'UPDATED') return <Tag color="blue">Atualizado</Tag>;
  if (action === 'DELETED') return <Tag color="red">Excluído</Tag>;
  if (action === 'RESTORED') return <Tag color="purple">Restaurado</Tag>;
  if (action === 'IMPORTED') return <Tag color="gold">Importado</Tag>;
  return <Tag>{actionType || '-'}</Tag>;
}

export function getImportStageLabel(stage: ImportStage) {
  switch (stage) {
    case 'idle':
      return 'Aguardando';
    case 'uploading':
      return 'Enviando';
    case 'queued':
      return 'Na fila';
    case 'processing':
      return 'Processando';
    case 'done':
      return 'Concluído';
    case 'error':
      return 'Erro';
    default:
      return '-';
  }
}

export function getImportStageTagColor(stage: ImportStage) {
  switch (stage) {
    case 'idle':
      return 'default';
    case 'uploading':
      return 'blue';
    case 'queued':
      return 'gold';
    case 'processing':
      return 'processing';
    case 'done':
      return 'success';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
}

export function makeLogId(text: string, at?: string) {
  return `${text}__${at || ''}`;
}

export function getEmissaoSortValue(record: DeliveryReport) {
  const raw = record.emissaoData || record.emissao;
  if (!raw) return 0;
  const d = dayjs(raw);
  return d.isValid() ? d.valueOf() : 0;
}

export function IdentifierCard({
  title,
  value,
}: {
  title: string;
  value?: string | number | null;
}) {
  return (
    <Card variant={false} size="small">
      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
        {title}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: 600 }}>{formatIdentifier(value)}</Text>
    </Card>
  );
}