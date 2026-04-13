import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { getUserLevel } from '../auth/access';
import ptBR from 'antd/es/date-picker/locale/pt_BR';
import 'dayjs/locale/pt-br';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  HistoryOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SearchOutlined,
  UploadOutlined,
  FileTextOutlined,
  CarOutlined,
  DollarCircleOutlined,
  PercentageOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  PieChartOutlined,
  GlobalOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';

dayjs.locale('pt-br');
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Dragger } = Upload;

type UserLite = {
  id: number;
  name: string;
  email?: string | null;
};

type DeliveryReportHistory = {
  id: number;
  deliveryReportId: number;
  actionType: string;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  comments?: string | null;
  performedByUserId?: number | null;
  performedByName?: string | null;
  performedByProfile?: string | null;
  createdAt: string;
  updatedAt?: string;
  performedByUser?: UserLite | null;
};

type DeliveryReport = {
  id: number;
  cte?: string | null;
  tipo?: string | null;
  emissao?: string | null;
  cidadeOrigem?: string | null;
  ufOrigem?: string | null;
  remetente?: string | null;
  cidadeDestino?: string | null;
  ufDestino?: string | null;
  destinatario?: string | null;
  notaFiscal?: string | null;
  nfValor?: number | string | null;
  pesoReal?: number | string | null;
  pesoCubado?: number | string | null;
  pesoTaxado?: number | string | null;
  volume?: number | string | null;
  frete?: number | string | null;
  icmsPercent?: number | string | null;
  icmsValor?: number | string | null;
  status?: string | null;
  previsaoEntrega?: string | null;
  dataEntrega?: string | null;
  modal?: string | null;
  statusEntrega?: string | null;
  operacao?: string | null;
  operacaoResumo?: string | null;
  cteNovo?: string | null;
  emissaoData?: string | null;
  transportadora?: string | null;
  encomenda?: string | null;
  reentregaDevolucao?: string | null;
  ultimaAtualizacao?: string | null;
  indice?: number | null;
  regiao?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdById?: number | null;
  updatedById?: number | null;
  deletedById?: number | null;
  createdBy?: UserLite | null;
  updatedBy?: UserLite | null;
  deletedBy?: UserLite | null;
  history?: DeliveryReportHistory[];
};

type DeliveryReportListResponse = {
  total: number;
  page: number;
  limit: number;
  pages: number;
  rows: DeliveryReport[];
};

type FiltersState = {
  search?: string;
  cte?: string;
  notaFiscal?: string;
  transportadora?: string;
  statusEntrega?: string;
  quarter?: string;
  operacao?: string;
  deletedFilter?: 'active' | 'all' | 'only';
  cancelledMode?: 'all' | 'hide' | 'only';
  startDate?: string;
  endDate?: string;
};

type QuickViewFilter = 'all' | 'cancelled' | 'delivered' | 'delayed' | 'deleted';

type FormValues = {
  cte?: string;
  tipo?: string;
  emissao?: Dayjs | null;
  cidadeOrigem?: string;
  ufOrigem?: string;
  remetente?: string;
  cidadeDestino?: string;
  ufDestino?: string;
  destinatario?: string;
  notaFiscal?: string;
  nfValor?: number | null;
  pesoReal?: number | null;
  pesoCubado?: number | null;
  pesoTaxado?: number | null;
  volume?: number | null;
  frete?: number | null;
  icmsPercent?: number | null;
  icmsValor?: number | null;
  status?: string;
  previsaoEntrega?: Dayjs | null;
  dataEntrega?: Dayjs | null;
  modal?: string;
  statusEntrega?: string;
  operacao?: string;
  operacaoResumo?: string;
  cteNovo?: string;
  emissaoData?: Dayjs | null;
  transportadora?: string;
  encomenda?: string;
  reentregaDevolucao?: string;
  ultimaAtualizacao?: Dayjs | null;
  indice?: number | null;
  regiao?: string;
  comments?: string;
};

type ExportFormValues = {
  search?: string;
  cte?: string;
  notaFiscal?: string;
  transportadora?: string;
  statusEntrega?: string;
  operacao?: string;
  regiao?: string;
  ufDestino?: string;
  cidadeDestino?: string;
  deletedFilter?: 'active' | 'all' | 'only';
  period?: [Dayjs, Dayjs];
  limit?: number;
};

type ImportStage = 'idle' | 'uploading' | 'queued' | 'processing' | 'done' | 'error';
type YearFilterValue = 'all' | string;

type ImportStartResponse = {
  message?: string;
  jobId: string;
  status?: string;
  version?: string;
};

type ImportStatusResponse = {
  jobId: string;
  fileName?: string;
  version?: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  createdAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  requestedBy?: {
    id?: number | null;
    name?: string;
  };
  totalLinhas?: number;
  processed?: number;
  inserted?: number;
  updated?: number;
  ignored?: number;
  progress?: number;
  currentLine?: number | null;
  message?: string;
  errors?: string[];
  warnings?: string[];
};

type ImportLogItem = {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  text: string;
  at: string;
};

type ImportPreviewRow = {
  key: string;
  cte?: string;
  notaFiscal?: string;
  transportadora?: string;
  operacao?: string;
  operacaoResumo?: string;
  status?: string;
};

const STATUS_ENTREGA_OPTIONS = [
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
const QUARTER_OPTIONS = [
  { label: '1º Trimestre', value: 'Q1' },
  { label: '2º Trimestre', value: 'Q2' },
  { label: '3º Trimestre', value: 'Q3' },
  { label: '4º Trimestre', value: 'Q4' },
];

const OPERACAO_OPTIONS = [
  'TRANSFERENCIA',
  'ENTREGA',
  'COLETA',
  'REDESPACHO',
  'DEVOLUCAO',
];

const REGIAO_OPTIONS = ['NORTE', 'NORDESTE', 'CENTRO-OESTE', 'SUDESTE', 'SUL'];
const MODAL_OPTIONS = ['RODOVIARIO', 'AEREO', 'MARITIMO', 'FERROVIARIO'];
function SummarySplitCard({
  title,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  subtitle,
  icon,
  accent,
  leftColor = '#0f172a',
  rightColor = '#0f172a',
}: {
  title: string;
  leftLabel: string;
  leftValue: number | string;
  rightLabel: string;
  rightValue: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
  leftColor?: string;
  rightColor?: string;
}) {
  return (
    <Card
      variant={false}
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
        border: '1px solid #eef2f7',
        height: '100%',
      }}
      styles={{ body: { padding: 18 } }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: '#64748b',
              fontSize: 13,
              fontWeight: 500,
              display: 'block',
              marginBottom: 14,
            }}
          >
            {title}
          </Text>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              alignItems: 'start',
              minHeight: 58,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <Text
                style={{
                  color: '#64748b',
                  fontSize: 12,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                {leftLabel}
              </Text>

              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: leftColor,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                }}
              >
                {leftValue}
              </div>
            </div>

            <div style={{ minWidth: 0, textAlign: 'right' }}>
              <Text
                style={{
                  color: '#64748b',
                  fontSize: 12,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                {rightLabel}
              </Text>

              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: rightColor,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                }}
              >
                {rightValue}
              </div>
            </div>
          </div>

          <Text
            style={{
              marginTop: 12,
              display: 'block',
              color: '#94a3b8',
              fontSize: 12,
              minHeight: 18,
            }}
          >
            {subtitle || ' '}
          </Text>
        </div>

        <div
          style={{
            minWidth: 48,
            width: 48,
            height: 48,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${accent}18`,
            color: accent,
            fontSize: 22,
            border: `1px solid ${accent}33`,
            boxShadow: `inset 0 1px 0 ${accent}22`,
          }}
        >
          {icon}
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          height: 5,
          borderRadius: 999,
          background: '#e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 999,
            background: `linear-gradient(90deg, ${accent}, ${accent}aa)`,
          }}
        />
      </div>
    </Card>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY') : '-';
}
function getQuarterRange(year: number, quarter: string) {
  if (quarter === 'Q1') {
    return [dayjs(`${year}-01-01`), dayjs(`${year}-03-31`)];
  }
  if (quarter === 'Q2') {
    return [dayjs(`${year}-04-01`), dayjs(`${year}-06-30`)];
  }
  if (quarter === 'Q3') {
    return [dayjs(`${year}-07-01`), dayjs(`${year}-09-30`)];
  }
  if (quarter === 'Q4') {
    return [dayjs(`${year}-10-01`), dayjs(`${year}-12-31`)];
  }
  return null;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY HH:mm:ss') : '-';
}

function toFormDate(value?: string | null) {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? d : null;
}

function normalizeCurrency(value?: number | string | null) {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatMoney(value?: number | string | null) {
  return normalizeCurrency(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatNumber(value?: number | string | null, digits = 2) {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatIdentifier(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value).replace(/,/g, '');
}

function formatCompactMoney(value?: number | string | null) {
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

function formatPercent(value?: number | null, digits = 1) {
  const num = Number(value || 0);
  return `${num.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

function getMonthLabel(monthIndex: number) {
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

function normalizeModal(value?: string | null) {
  const v = String(value || '').trim().toUpperCase();
  if (!v) return 'NÃO INFORMADO';
  if (v.includes('AERE')) return 'Aéreo';
  if (v.includes('RODO')) return 'Rodoviário';
  if (v.includes('MARIT')) return 'Marítimo';
  if (v.includes('FERRO')) return 'Ferroviário';
  return value || 'NÃO INFORMADO';
}

function normalizeOperationLabel(value?: string | null) {
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

function normalizeStatusBucket(value?: string | null, record?: DeliveryReport) {
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

function getRecordDate(record: DeliveryReport) {
  const raw = record.emissaoData || record.emissao;
  const d = dayjs(raw);
  return d.isValid() ? d : null;
}

function cleanObject<T extends Record<string, any>>(obj: T) {
  const out: Record<string, any> = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      out[key] = value;
    }
  });
  return out as T;
}

function mapFormToPayload(values: FormValues) {
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

function mapRecordToFormValues(record: DeliveryReport): FormValues {
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
function resolveStatusEntrega(record: DeliveryReport) {
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
function statusEntregaTag(status?: string | null, record?: DeliveryReport) {
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

function actionTag(actionType?: string | null) {
  const action = String(actionType || '').toUpperCase();
  if (action === 'CREATED') return <Tag color="green">Criado</Tag>;
  if (action === 'UPDATED') return <Tag color="blue">Atualizado</Tag>;
  if (action === 'DELETED') return <Tag color="red">Excluído</Tag>;
  if (action === 'RESTORED') return <Tag color="purple">Restaurado</Tag>;
  if (action === 'IMPORTED') return <Tag color="gold">Importado</Tag>;
  return <Tag>{actionType || '-'}</Tag>;
}

function IdentifierCard({
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

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  accent,
  prefix,
  suffix,
  precision,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
  prefix?: string;
  suffix?: string;
  precision?: number;
}) {
  const isNumber = typeof value === 'number';

  const formattedValue =
    isNumber && typeof precision === 'number'
      ? Number(value).toLocaleString('pt-BR', {
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        })
      : isNumber
      ? Number(value).toLocaleString('pt-BR')
      : String(value);

  return (
    <Card
      variant={false}
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
        border: '1px solid #eef2f7',
        height: '100%',
      }}
      styles={{ body: { padding: 18 } }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: '#64748b',
              fontSize: 13,
              fontWeight: 500,
              display: 'block',
              marginBottom: 8,
            }}
          >
            {title}
          </Text>

          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}
          >
            {prefix ? `${prefix} ` : ''}
            {formattedValue}
            {suffix ? ` ${suffix}` : ''}
          </div>

          {subtitle ? (
            <Text
              style={{
                marginTop: 8,
                display: 'block',
                color: '#94a3b8',
                fontSize: 12,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </div>

        <div
          style={{
            minWidth: 48,
            width: 48,
            height: 48,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${accent}18`,
            color: accent,
            fontSize: 22,
            border: `1px solid ${accent}33`,
            boxShadow: `inset 0 1px 0 ${accent}22`,
          }}
        >
          {icon}
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          height: 5,
          borderRadius: 999,
          background: '#e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 999,
            background: `linear-gradient(90deg, ${accent}, ${accent}aa)`,
          }}
        />
      </div>
    </Card>
  );
}

function getImportStageLabel(stage: ImportStage) {
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

function getImportStageTagColor(stage: ImportStage) {
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

function makeLogId(text: string, at?: string) {
  return `${text}__${at || ''}`;
}

function getEmissaoSortValue(record: DeliveryReport) {
  const raw = record.emissaoData || record.emissao;
  if (!raw) return 0;
  const d = dayjs(raw);
  return d.isValid() ? d.valueOf() : 0;
}

export default function DeliveryReportsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const userLevel = getUserLevel(user);

  const [filterForm] = Form.useForm();
  const [drawerForm] = Form.useForm<FormValues>();
  const [exportForm] = Form.useForm<ExportFormValues>();

  const [filters, setFilters] = useState<FiltersState>({
    deletedFilter: 'all',
    cancelledMode: 'all',
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [quickView, setQuickView] = useState<QuickViewFilter>('all');

  const [openForm, setOpenForm] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [openExport, setOpenExport] = useState(false);

  const [openResumoModal, setOpenResumoModal] = useState(false);
  const [openPainelModal, setOpenPainelModal] = useState(false);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingRecord, setEditingRecord] = useState<DeliveryReport | null>(null);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importStage, setImportStage] = useState<ImportStage>('idle');
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatusResponse | null>(null);
  const [importLogs, setImportLogs] = useState<ImportLogItem[]>([]);
  const [importPreviewRows, setImportPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [importPreviewHeaders, setImportPreviewHeaders] = useState<string[]>([]);
  const [readingPreview, setReadingPreview] = useState(false);
  const [showResumo, setShowResumo] = useState(false);
  const [exporting, setExporting] = useState(false);

  const currentYear = dayjs().year();
  const defaultYearValue = String(currentYear);
  const watchedPrevisaoEntrega = Form.useWatch('previsaoEntrega', drawerForm);
  const watchedDataEntrega = Form.useWatch('dataEntrega', drawerForm);

  useEffect(() => {
    if (!openForm) return;

    const computed = resolveStatusEntrega({
      ...(editingRecord || ({} as DeliveryReport)),
      previsaoEntrega: watchedPrevisaoEntrega ? watchedPrevisaoEntrega.toISOString() : null,
      dataEntrega: watchedDataEntrega ? watchedDataEntrega.toISOString() : null,
    } as DeliveryReport);

    if (drawerForm.getFieldValue('statusEntrega') !== computed) {
      drawerForm.setFieldValue('statusEntrega', computed);
    }
  }, [openForm, editingRecord, watchedPrevisaoEntrega, watchedDataEntrega, drawerForm]);

  const yearOptions = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const year = currentYear - i;
        return { label: String(year), value: String(year) as YearFilterValue };
      }),
    [currentYear]
  );

  const [yearFilter, setYearFilter] = useState<YearFilterValue>(defaultYearValue);
  const logsContainerRef = useRef<HTMLDivElement | null>(null);

  const canCreateEdit = userLevel >= 2;
  const canDeleteRestore = userLevel >= 3;

  const appendImportLog = (
    text: string,
    type: ImportLogItem['type'] = 'info',
    at?: string
  ) => {
    const id = makeLogId(text, at);

    setImportLogs((prev) => {
      if (prev.some((item) => item.id === id)) return prev;
      return [
        ...prev,
        {
          id,
          text,
          type,
          at: at || dayjs().format('HH:mm:ss'),
        },
      ].slice(-100);
    });
  };

  const buildPreviewFromFile = async (file: File) => {
    setReadingPreview(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: true });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        setImportPreviewRows([]);
        setImportPreviewHeaders([]);
        appendImportLog('A planilha selecionada não possui abas válidas.', 'warning');
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '', raw: false });
      const headers = Object.keys(rows[0] || {}).slice(0, 8);
      const previewRows = rows.slice(0, 6).map((row, index) => ({
        key: String(index + 1),
        cte: String(row['CTE'] ?? row['cte'] ?? row['Cte'] ?? ''),
        notaFiscal: String(row['Nota Fiscal'] ?? row['NOTA FISCAL'] ?? row['notaFiscal'] ?? row['nota_fiscal'] ?? ''),
        transportadora: String(row['Transportadora'] ?? row['transportadora'] ?? ''),
        operacao: String(row['Operação'] ?? row['Operacao'] ?? row['operacao'] ?? ''),
        operacaoResumo: String(row['Resumo Operação'] ?? row['Resumo Operacao'] ?? row['operacaoResumo'] ?? row['operacao_resumo'] ?? ''),
        status: String(row['Status'] ?? row['status'] ?? row['Status Entrega'] ?? row['statusEntrega'] ?? ''),
      }));

      setImportPreviewHeaders(headers);
      setImportPreviewRows(previewRows);
      appendImportLog(`Amostra carregada: ${rows.length.toLocaleString('pt-BR')} linha(s) encontradas na planilha.`, 'info');
    } catch (error: any) {
      setImportPreviewRows([]);
      setImportPreviewHeaders([]);
      appendImportLog(error?.message || 'Não foi possível ler a amostra do arquivo.', 'error');
    } finally {
      setReadingPreview(false);
    }
  };

  const resetImportState = () => {
    setImportFile(null);
    setUploadProgress(0);
    setImportStage('idle');
    setImportJobId(null);
    setImportStatus(null);
    setImportLogs([]);
    setImportPreviewRows([]);
    setImportPreviewHeaders([]);
    setReadingPreview(false);
  };

  useEffect(() => {
    if (!logsContainerRef.current) return;
    logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
  }, [importLogs]);

  const yearMode = yearFilter === 'all' ? 'all' : 'selected';
  const selectedYearValue = yearFilter !== 'all' ? yearFilter : undefined;

  const effectiveDeletedFilter = useMemo<'active' | 'all' | 'only'>(() => {
    if (quickView === 'deleted') return 'only';
    return filters.deletedFilter || 'all';
  }, [quickView, filters.deletedFilter]);

  const effectiveStatusEntrega = useMemo<string | undefined>(() => {
    if (quickView === 'cancelled') return 'CANCELADA';
    if (quickView === 'delivered') return 'NO PRAZO';
    if (quickView === 'delayed') return 'FORA DO PRAZO';
    if (quickView === 'deleted') return undefined;
    return filters.statusEntrega;
  }, [quickView, filters.statusEntrega]);

  const effectiveCancelledMode = useMemo<'all' | 'hide' | 'only'>(() => {
    if (quickView === 'cancelled') return 'only';
    return filters.cancelledMode || 'all';
  }, [quickView, filters.cancelledMode]);

const queryParams = useMemo(
  () =>
    cleanObject({
      page,
      limit: pageSize,
      search: filters.search,
      cte: filters.cte,
      notaFiscal: filters.notaFiscal,
      transportadora: filters.transportadora,
      statusEntrega: effectiveStatusEntrega,
      operacao: filters.operacao,
      quarter: filters.quarter,
      deletedFilter: effectiveDeletedFilter,
      cancelledMode: effectiveCancelledMode,
      includeCancelled: effectiveCancelledMode === 'hide' ? 'false' : 'true',
      startDate: filters.startDate,
      endDate: filters.endDate,
      yearMode,
      years: selectedYearValue,
    }),
  [
    filters.search,
    filters.cte,
    filters.notaFiscal,
    filters.transportadora,
    filters.operacao,
    filters.quarter,
    filters.startDate,
    filters.endDate,
    effectiveStatusEntrega,
    effectiveDeletedFilter,
    effectiveCancelledMode,
    page,
    pageSize,
    yearMode,
    selectedYearValue,
  ]
);

  const baseFilterParams = useMemo(
    () =>
      cleanObject({
        search: filters.search,
        cte: filters.cte,
        notaFiscal: filters.notaFiscal,
        transportadora: filters.transportadora,
        statusEntrega: effectiveStatusEntrega,
        operacao: filters.operacao,
        quarter: filters.quarter,
        deletedFilter: effectiveDeletedFilter,
        cancelledMode: effectiveCancelledMode,
        includeCancelled: effectiveCancelledMode === 'hide' ? 'false' : 'true',
        startDate: filters.startDate,
        endDate: filters.endDate,
        yearMode,
        years: selectedYearValue,
      }),
    [
      filters.search,
      filters.cte,
      filters.notaFiscal,
      filters.transportadora,
      filters.operacao,
      filters.startDate,
      filters.endDate,
      effectiveStatusEntrega,
      effectiveDeletedFilter,
      effectiveCancelledMode,
      yearMode,
      selectedYearValue,
    ]
  );

  const listQuery = useQuery<DeliveryReportListResponse>({
    queryKey: ['delivery-reports', queryParams],
    queryFn: async () => (await api.get('/delivery-reports', { params: queryParams })).data,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30000,
  });

  const summaryQuery = useQuery<DeliveryReportListResponse>({
    queryKey: ['delivery-reports-summary-all', baseFilterParams],
    queryFn: async () =>
      (
        await api.get('/delivery-reports', {
          params: {
            ...baseFilterParams,
            page: 1,
            limit: 50000,
          },
        })
      ).data,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30000,
  });

  const detailsQuery = useQuery<DeliveryReport>({
    queryKey: ['delivery-report-details', selectedId],
    queryFn: async () => (await api.get(`/delivery-reports/${selectedId}`)).data,
    enabled: !!selectedId && (openDetails || openForm),
  });

  const historyQuery = useQuery<DeliveryReportHistory[]>({
    queryKey: ['delivery-report-history', selectedId],
    queryFn: async () => (await api.get(`/delivery-reports/${selectedId}/history`)).data,
    enabled: !!selectedId && openHistory,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) =>
      (await api.post('/delivery-reports', payload)).data,
    onSuccess: () => {
      message.success('CTE cadastrado com sucesso');
      setOpenForm(false);
      setEditingRecord(null);
      drawerForm.resetFields();
      qc.invalidateQueries({ queryKey: ['delivery-reports'] });
      qc.invalidateQueries({ queryKey: ['delivery-reports-summary-all'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || 'Falha ao cadastrar CTE');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Record<string, any> }) =>
      (await api.put(`/delivery-reports/${id}`, payload)).data,
    onSuccess: (_, vars) => {
      message.success('CTE atualizado com sucesso');
      setOpenForm(false);
      setEditingRecord(null);
      drawerForm.resetFields();
      qc.invalidateQueries({ queryKey: ['delivery-reports'] });
      qc.invalidateQueries({ queryKey: ['delivery-reports-summary-all'] });
      qc.invalidateQueries({ queryKey: ['delivery-report-details', vars.id] });
      qc.invalidateQueries({ queryKey: ['delivery-report-history', vars.id] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || 'Falha ao atualizar CTE');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, comments }: { id: number; comments?: string }) =>
      (await api.delete(`/delivery-reports/${id}`, { data: { comments } })).data,
    onSuccess: (_, vars) => {
      message.success('CTE excluído com sucesso');
      qc.invalidateQueries({ queryKey: ['delivery-reports'] });
      qc.invalidateQueries({ queryKey: ['delivery-reports-summary-all'] });
      qc.invalidateQueries({ queryKey: ['delivery-report-details', vars.id] });
      qc.invalidateQueries({ queryKey: ['delivery-report-history', vars.id] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || 'Falha ao excluir CTE');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ id, comments }: { id: number; comments?: string }) =>
      (await api.patch(`/delivery-reports/${id}/restore`, { comments })).data,
    onSuccess: (_, vars) => {
      message.success('CTE restaurado com sucesso');
      qc.invalidateQueries({ queryKey: ['delivery-reports'] });
      qc.invalidateQueries({ queryKey: ['delivery-reports-summary-all'] });
      qc.invalidateQueries({ queryKey: ['delivery-report-details', vars.id] });
      qc.invalidateQueries({ queryKey: ['delivery-report-history', vars.id] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || 'Falha ao restaurar CTE');
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadProgress(0);
      setImportStage('uploading');
      setImportJobId(null);
      setImportStatus(null);
      setImportLogs([]);

      appendImportLog(`Arquivo selecionado: ${file.name}`, 'info');
      appendImportLog('Enviando arquivo para o servidor...', 'info');

      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post<ImportStartResponse>('/delivery-reports/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent: any) => {
          const total = progressEvent?.total || 0;
          const loaded = progressEvent?.loaded || 0;
          if (total > 0) {
            setUploadProgress(Math.round((loaded * 100) / total));
          }
        },
      });

      return response.data;
    },
    onSuccess: (data) => {
      setUploadProgress(100);
      setImportJobId(data.jobId);
      setImportStage('queued');
      appendImportLog(`Importação iniciada com sucesso. Job ${data.jobId}${data.version ? ` (${data.version})` : ''}`, 'success');
      appendImportLog('Aguardando processamento do servidor...', 'info');
      message.success(data?.message || 'Importação iniciada com sucesso');
    },
    onError: (e: any) => {
      setImportStage('error');
      setUploadProgress(0);
      setImportJobId(null);
      setImportStatus(null);
      const msg = e?.response?.data?.message || 'Falha ao iniciar importação';
      appendImportLog(msg, 'error');
      message.error(msg);
    },
  });

  useEffect(() => {
    if (!openImport || !importJobId) return;

    let cancelled = false;
    let lastStatus = '';
    let lastMessage = '';
    let lastProcessed = -1;
    let lastErrorsCount = 0;
    let lastWarningsCount = 0;

    const applyStatus = (data: ImportStatusResponse) => {
      if (cancelled) return;

      setImportStatus(data);

      if (data.status === 'queued') setImportStage('queued');
      else if (data.status === 'processing') setImportStage('processing');
      else if (data.status === 'done') setImportStage('done');
      else if (data.status === 'error') setImportStage('error');

      if (data.status !== lastStatus) {
        lastStatus = data.status;

        if (data.status === 'queued') {
          appendImportLog('Job entrou na fila de processamento.', 'info');
        } else if (data.status === 'processing') {
          appendImportLog('Servidor começou a processar a planilha.', 'info');
        } else if (data.status === 'done') {
          appendImportLog('Importação concluída com sucesso.', 'success');
        } else if (data.status === 'error') {
          appendImportLog(data.message || 'Erro durante a importação.', 'error');
        }
      }

      if (data.message && data.message !== lastMessage) {
        lastMessage = data.message;
        appendImportLog(
          data.message,
          data.status === 'error' ? 'error' : data.status === 'done' ? 'success' : 'info'
        );
      }

      if (typeof data.processed === 'number' && data.processed !== lastProcessed) {
        if (data.processed > 0 && data.totalLinhas) {
          appendImportLog(
            `Progresso: ${data.processed}/${data.totalLinhas} linha(s) processada(s).`,
            'info'
          );
        }
        lastProcessed = data.processed;
      }

      const currentWarningsCount = data.warnings?.length || 0;
      if (currentWarningsCount > lastWarningsCount) {
        const newWarnings = data.warnings?.slice(lastWarningsCount) || [];
        newWarnings.forEach((warn) => appendImportLog(warn, 'warning'));
        lastWarningsCount = currentWarningsCount;
      }

      const currentErrorsCount = data.errors?.length || 0;
      if (currentErrorsCount > lastErrorsCount) {
        const newErrors = data.errors?.slice(lastErrorsCount) || [];
        newErrors.forEach((err) => appendImportLog(err, 'error'));
        lastErrorsCount = currentErrorsCount;
      }
    };

    const fetchStatus = async () => {
      try {
        const response = await api.get<ImportStatusResponse>(
          `/delivery-reports/import/status/${importJobId}`
        );
        if (cancelled) return;
        applyStatus(response.data);
      } catch {
        if (!cancelled) {
          setImportStage('error');
          appendImportLog('Falha ao consultar status da importação.', 'error');
        }
      }
    };

    fetchStatus();

    const interval = setInterval(async () => {
      try {
        const response = await api.get<ImportStatusResponse>(
          `/delivery-reports/import/status/${importJobId}`
        );

        if (cancelled) return;

        const data = response.data;
        applyStatus(data);

        if (data.status === 'done') {
          clearInterval(interval);
          qc.invalidateQueries({ queryKey: ['delivery-reports'] });
          qc.invalidateQueries({ queryKey: ['delivery-reports-summary-all'] });
          message.success(data.message || 'Importação concluída');
        } else if (data.status === 'error') {
          clearInterval(interval);
          message.error(data.message || 'Erro durante a importação');
        }
      } catch (error: any) {
        if (!cancelled) {
          setImportStage('error');
          clearInterval(interval);
          const msg =
            error?.response?.data?.message || 'Falha ao consultar status da importação';
          appendImportLog(msg, 'error');
          message.error(msg);
        }
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [openImport, importJobId, qc]);

  const rows = listQuery.data?.rows || [];
  const total = listQuery.data?.total || 0;
  const summaryRows = summaryQuery.data?.rows || [];
  const resumoPeso = useMemo(() => {
    const activeRows = summaryRows.filter((r) => !r.deletedAt);

    const totalPeso = activeRows.reduce(
      (acc, item) => acc + normalizeCurrency(item.pesoReal),
      0
    );

    const totalVolumes = activeRows.reduce(
      (acc, item) => acc + normalizeCurrency(item.volume),
      0
    );

    const totalRegistros = activeRows.length;

    return {
      totalPeso,
      totalVolumes,
      totalRegistros,
    };
  }, [summaryRows]);
  const summary = useMemo(() => {
    const activeRows = summaryRows.filter((r) => !r.deletedAt);

    const totalCteAtivas = activeRows.length;
    const totalExcluidos = summaryRows.filter((r) => !!r.deletedAt).length;

    const totalValorNF = activeRows.reduce((acc, item) => acc + normalizeCurrency(item.nfValor), 0);
    const totalFrete = activeRows.reduce((acc, item) => acc + normalizeCurrency(item.frete), 0);
    const totalArmazenagem = activeRows.reduce((acc, item) => acc + normalizeCurrency(item.icmsValor), 0);
    const totalGastos = totalFrete + totalArmazenagem;

    const freteMedio = totalCteAtivas > 0 ? totalFrete / totalCteAtivas : 0;
    const percentualFreteSobreNF = totalValorNF > 0 ? (totalFrete / totalValorNF) * 100 : 0;
    const percentualTotalSobreNF = totalValorNF > 0 ? (totalGastos / totalValorNF) * 100 : 0;
    const percentualArmazemSobreNF = totalValorNF > 0 ? (totalArmazenagem / totalValorNF) * 100 : 0;

    const delivered = activeRows.filter((r) => resolveStatusEntrega(r) === 'NO PRAZO').length;

    const delayed = activeRows.filter((r) => resolveStatusEntrega(r) === 'FORA DO PRAZO').length;

    const deleted = summaryRows.filter((r) => !!r.deletedAt).length;

    return {
      totalCteAtivas,
      totalExcluidos,
      totalValorNF,
      totalFrete,
      totalArmazenagem,
      totalGastos,
      freteMedio,
      percentualFreteSobreNF,
      percentualTotalSobreNF,
      percentualArmazemSobreNF,
      delivered,
      delayed,
      deleted,
    };
  }, [summaryRows]);

  const dashboardData = useMemo(() => {
    const activeRows = summaryRows.filter((r) => !r.deletedAt);

    const totalNF = activeRows.reduce((acc, item) => acc + normalizeCurrency(item.nfValor), 0);
    const totalFrete = activeRows.reduce((acc, item) => acc + normalizeCurrency(item.frete), 0);
    const totalArmazenagem = activeRows.reduce((acc, item) => acc + normalizeCurrency(item.icmsValor), 0);
    const totalGastos = totalFrete + totalArmazenagem;

    const byRegionMap = new Map<
      string,
      {
        regiao: string;
        nf: number;
        frete: number;
        quantidade: number;
      }
    >();

    const byRegionOperationMap = new Map<
      string,
      {
        regiao: string;
        operacao: string;
        nf: number;
        frete: number;
        quantidade: number;
      }
    >();

    const byOperationMap = new Map<string, { operacao: string; valor: number; quantidade: number }>();
    const byStatusMap = new Map<string, { status: string; quantidade: number }>();
    const byModalMap = new Map<string, { modal: string; frete: number; quantidade: number }>();
    const byMonthMap = new Map<
      string,
      {
        key: string;
        month: string;
        monthNumber: number;
        year: number;
        nf: number;
        frete: number;
        armazenagem: number;
        total: number;
        percentualFrete: number;
      }
    >();

    activeRows.forEach((item) => {
      const regiao = (item.regiao || 'NÃO INFORMADO').toUpperCase();
      const nf = normalizeCurrency(item.nfValor);
      const frete = normalizeCurrency(item.frete);
      const armazenagem = normalizeCurrency(item.icmsValor);
      const gastos = frete + armazenagem;

      const regionCurrent = byRegionMap.get(regiao) || {
        regiao,
        nf: 0,
        frete: 0,
        quantidade: 0,
      };

      regionCurrent.nf += nf;
      regionCurrent.frete += frete;
      regionCurrent.quantidade += 1;
      byRegionMap.set(regiao, regionCurrent);

      const operacaoNormalizada = normalizeOperationLabel(item.operacao || item.operacaoResumo || 'OUTROS');

      const regionOperationKey = `${regiao}__${operacaoNormalizada}`;
      const regionOperationCurrent = byRegionOperationMap.get(regionOperationKey) || {
        regiao,
        operacao: operacaoNormalizada,
        nf: 0,
        frete: 0,
        quantidade: 0,
      };

      regionOperationCurrent.nf += nf;
      regionOperationCurrent.frete += frete;
      regionOperationCurrent.quantidade += 1;
      byRegionOperationMap.set(regionOperationKey, regionOperationCurrent);

      const operationCurrent = byOperationMap.get(operacaoNormalizada) || {
        operacao: operacaoNormalizada,
        valor: 0,
        quantidade: 0,
      };
      operationCurrent.valor += nf;
      operationCurrent.quantidade += 1;
      byOperationMap.set(operacaoNormalizada, operationCurrent);

      const status = normalizeStatusBucket(item.statusEntrega, item);
      const statusCurrent = byStatusMap.get(status) || {
        status,
        quantidade: 0,
      };
      statusCurrent.quantidade += 1;
      byStatusMap.set(status, statusCurrent);

      const modal = normalizeModal(item.modal);
      const modalCurrent = byModalMap.get(modal) || {
        modal,
        frete: 0,
        quantidade: 0,
      };
      modalCurrent.frete += frete;
      modalCurrent.quantidade += 1;
      byModalMap.set(modal, modalCurrent);

      const d = getRecordDate(item);
      if (d) {
        const monthNumber = d.month();
        const year = d.year();
        const monthKey = `${year}-${String(monthNumber + 1).padStart(2, '0')}`;
        const monthCurrent = byMonthMap.get(monthKey) || {
          key: monthKey,
          month: getMonthLabel(monthNumber),
          monthNumber,
          year,
          nf: 0,
          frete: 0,
          armazenagem: 0,
          total: 0,
          percentualFrete: 0,
        };

        monthCurrent.nf += nf;
        monthCurrent.frete += frete;
        monthCurrent.armazenagem += armazenagem;
        monthCurrent.total += gastos;
        byMonthMap.set(monthKey, monthCurrent);
      }
    });

    const regionOrder = ['NORTE', 'NORDESTE', 'CENTRO-OESTE', 'SUDESTE', 'SUL', 'NÃO INFORMADO'];

    const regions = Array.from(byRegionMap.values())
      .map((item) => ({
        ...item,
        percentualFrete: item.nf > 0 ? (item.frete / item.nf) * 100 : 0,
      }))
      .sort((a, b) => {
        const ia = regionOrder.indexOf(a.regiao);
        const ib = regionOrder.indexOf(b.regiao);
        if (ia === -1 && ib === -1) return a.regiao.localeCompare(b.regiao);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });

    const operationOrder = [
      'VENDA',
      'AVANÇO DE ESTOQUE TÉCNICO',
      'REVERSA',
      'REVERSA PRESTADOR',
      'COMODATO',
      'AVANÇO DE ESTOQUE ARMAZÉM',
      'OUTROS',
    ];

    const regionOperationRows: any[] = regions.flatMap((region) => {
      const children = Array.from(byRegionOperationMap.values())
        .filter((item) => item.regiao === region.regiao)
        .map((item) => ({
          ...item,
          percentualFrete: item.nf > 0 ? (item.frete / item.nf) * 100 : 0,
          isChild: true,
          key: `${item.regiao}-${item.operacao}`,
        }))
        .sort((a, b) => {
          const ia = operationOrder.indexOf(a.operacao);
          const ib = operationOrder.indexOf(b.operacao);
          if (ia === -1 && ib === -1) return a.operacao.localeCompare(b.operacao);
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        });

      const regionRow = {
        key: `region-${region.regiao}`,
        regiao: region.regiao,
        operacao: '',
        nf: region.nf,
        frete: region.frete,
        percentualFrete: region.percentualFrete,
        isGroup: true,
      };

      return [regionRow, ...children];
    });

    regionOperationRows.push({
      key: 'total-geral',
      regiao: 'TOTAL',
      operacao: '',
      nf: totalNF,
      frete: totalFrete,
      percentualFrete: totalNF > 0 ? (totalFrete / totalNF) * 100 : 0,
      isTotal: true,
    });

    const operations = Array.from(byOperationMap.values()).sort((a, b) => b.valor - a.valor);

    const statuses = Array.from(byStatusMap.values()).sort((a, b) => b.quantidade - a.quantidade);

    const modais = Array.from(byModalMap.values())
      .map((item) => ({
        ...item,
        percentual: totalFrete > 0 ? (item.frete / totalFrete) * 100 : 0,
      }))
      .sort((a, b) => b.frete - a.frete);

    const months = Array.from(byMonthMap.values())
      .map((item) => ({
        ...item,
        percentualFrete: item.nf > 0 ? (item.frete / item.nf) * 100 : 0,
        percentualArmazem: item.nf > 0 ? (item.armazenagem / item.nf) * 100 : 0,
        percentualTotal: item.nf > 0 ? (item.total / item.nf) * 100 : 0,
      }))
      .sort((a, b) => a.key.localeCompare(b.key));

    return {
      totalNF,
      totalFrete,
      totalArmazenagem,
      totalGastos,
      percentualFrete: totalNF > 0 ? (totalFrete / totalNF) * 100 : 0,
      percentualArmazem: totalNF > 0 ? (totalArmazenagem / totalNF) * 100 : 0,
      percentualTotal: totalNF > 0 ? (totalGastos / totalNF) * 100 : 0,
      regions,
      regionOperationRows,
      operations,
      statuses,
      modais,
      months,
    };
  }, [summaryRows]);

  const transportadoraOptions = useMemo(() => {
    const set = new Set<string>();
    summaryRows.forEach((r) => {
      if (r.transportadora) set.add(r.transportadora);
    });
    return Array.from(set)
      .sort()
      .map((value) => ({ label: value, value }));
  }, [summaryRows]);

  const buildExportParams = (values: ExportFormValues) => {
    const startDate = values.period?.[0] ? dayjs(values.period[0]).startOf('day').toISOString() : undefined;
    const endDate = values.period?.[1] ? dayjs(values.period[1]).endOf('day').toISOString() : undefined;

    return cleanObject({
      search: values.search?.trim() || undefined,
      cte: values.cte?.trim() || undefined,
      notaFiscal: values.notaFiscal?.trim() || undefined,
      transportadora: values.transportadora || undefined,
      statusEntrega: values.statusEntrega || effectiveStatusEntrega,
      operacao: values.operacao || undefined,
      regiao: values.regiao || undefined,
      ufDestino: values.ufDestino?.trim()?.toUpperCase() || undefined,
      cidadeDestino: values.cidadeDestino?.trim() || undefined,
      deletedFilter: values.deletedFilter || effectiveDeletedFilter,
      cancelledMode: effectiveCancelledMode,
      includeCancelled: effectiveCancelledMode === 'hide' ? 'false' : 'true',
      startDate,
      endDate,
      page: 1,
      limit: values.limit || 5000,
      yearMode,
      years: selectedYearValue,
    });
  };

  const handleExport = async () => {
    try {
      const values = await exportForm.validateFields();
      const period = values.period;

      if (period) {
        const days = dayjs(period[1]).diff(dayjs(period[0]), 'day');
        if (days > 120) {
          const confirmed = await new Promise<boolean>((resolve) => {
            Modal.confirm({
              title: 'Período muito grande',
              content: `Você está tentando exportar ${days + 1} dias. Isso pode gerar um arquivo muito pesado. Deseja continuar?`,
              okText: 'Continuar',
              cancelText: 'Cancelar',
              onOk: () => resolve(true),
              onCancel: () => resolve(false),
            });
          });
          if (!confirmed) return;
        }
      }

      const params = buildExportParams(values);
      setExporting(true);

      const response = await api.get('/delivery-reports', { params });
      const exportRows: DeliveryReport[] = response.data?.rows || [];

      if (!exportRows.length) {
        message.warning('Nenhum registro encontrado para exportar');
        return;
      }

      const data = exportRows.map((item) => ({
        CTE: formatIdentifier(item.cte),
        Emissão: formatDate(item.emissaoData || item.emissao),
        Tipo: item.tipo || '',
        'Cidade Origem': item.cidadeOrigem || '',
        'UF Origem': item.ufOrigem || '',
        Remetente: item.remetente || '',
        'Cidade Destino': item.cidadeDestino || '',
        'UF Destino': item.ufDestino || '',
        Destinatário: item.destinatario || '',
        'Nota Fiscal': formatIdentifier(item.notaFiscal),
        'Valor NF': normalizeCurrency(item.nfValor),
        'Peso Real': normalizeCurrency(item.pesoReal),
        'Peso Cubado': normalizeCurrency(item.pesoCubado),
        'Peso Taxado': normalizeCurrency(item.pesoTaxado),
        Volume: normalizeCurrency(item.volume),
        Frete: normalizeCurrency(item.frete),
        'ICMS %': normalizeCurrency(item.icmsPercent),
        'ICMS Valor': normalizeCurrency(item.icmsValor),
        Status: item.status || '',
        'Previsão Entrega': formatDate(item.previsaoEntrega),
        'Data Entrega': formatDate(item.dataEntrega),
        Modal: item.modal || '',
        'Status Entrega': item.statusEntrega || '',
        Operação: item.operacao || '',
        'Resumo Operação': item.operacaoResumo || '',
        'CTE Novo': formatIdentifier(item.cteNovo),
        Transportadora: item.transportadora || '',
        Encomenda: item.encomenda || '',
        'Reentrega/Devolução': item.reentregaDevolucao || '',
        'Última Atualização': formatDateTime(item.ultimaAtualizacao),
        Índice: item.indice ?? '',
        Região: item.regiao || '',
        Excluído: item.deletedAt ? 'Sim' : 'Não',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CTEs');

      const start = params.startDate ? dayjs(params.startDate).format('YYYY-MM-DD') : 'inicio';
      const end = params.endDate ? dayjs(params.endDate).format('YYYY-MM-DD') : 'fim';
      const fileName = `delivery-reports-${start}_a_${end}-${dayjs().format('HH-mm')}.xlsx`;

      XLSX.writeFile(wb, fileName);
      message.success(`Exportação concluída: ${fileName}`);
      setOpenExport(false);
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Falha ao exportar registros');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!openExport) return;

    exportForm.setFieldsValue({
      search: filters.search,
      cte: filters.cte,
      notaFiscal: filters.notaFiscal,
      transportadora: filters.transportadora,
      statusEntrega: effectiveStatusEntrega,
      operacao: filters.operacao,
      deletedFilter: effectiveDeletedFilter,
      period:
        filters.startDate && filters.endDate ? [dayjs(filters.startDate), dayjs(filters.endDate)] : undefined,
      limit: 5000,
    });
  }, [openExport, exportForm, filters, effectiveStatusEntrega, effectiveDeletedFilter]);
  
    const handleExportResumoRegional = () => {
      try {
        const data = dashboardData.regionOperationRows.map((item: any) => ({
          Regional: item.regiao || '',
          Operacao: item.operacao || '',
          ValorNF: normalizeCurrency(item.nf),
          ValorFrete: normalizeCurrency(item.frete),
          PercentualFrete: Number(item.percentualFrete || 0),
          TipoLinha: item.isTotal ? 'TOTAL' : item.isGroup ? 'GRUPO' : 'DETALHE',
        }));

        if (!data.length) {
          message.warning('Nenhum dado disponível para exportar');
          return;
        }

        const ws = XLSX.utils.json_to_sheet(data);

        ws['!cols'] = [
          { wch: 18 },
          { wch: 28 },
          { wch: 16 },
          { wch: 16 },
          { wch: 18 },
          { wch: 12 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Resumo Regional');

        const fileName = `resumo-regional-${dayjs().format('YYYY-MM-DD_HH-mm')}.xlsx`;
        XLSX.writeFile(wb, fileName);

        message.success(`Arquivo exportado: ${fileName}`);
      } catch (error) {
        message.error('Não foi possível exportar o resumo regional');
      }
    };
  const columns: ColumnsType<DeliveryReport> = [
    {
      title: 'CTE',
      dataIndex: 'cte',
      key: 'cte',
      width: 120,
      fixed: 'left',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text
            strong
            style={{
              color: record.deletedAt ? '#8c8c8c' : undefined,
              textDecoration: record.deletedAt ? 'line-through' : undefined,
            }}
          >
            {formatIdentifier(record.cte)}
          </Text>
          {record.deletedAt ? <Tag color="red">Excluído</Tag> : null}
        </Space>
      ),
    },
    {
      title: 'Emissão',
      key: 'emissaoData',
      width: 120,
      sorter: (a, b) => getEmissaoSortValue(a) - getEmissaoSortValue(b),
      defaultSortOrder: 'descend',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ color: record.deletedAt ? '#8c8c8c' : undefined }}>
            {formatDate(record.emissaoData || record.emissao)}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.emissaoData ? 'Data de Emissão' : 'Emissão'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Previsão',
      dataIndex: 'previsaoEntrega',
      key: 'previsaoEntrega',
      width: 120,
      render: (value, record) => (
        <Text style={{ color: record.deletedAt ? '#8c8c8c' : undefined }}>{formatDate(value)}</Text>
      ),
    },
    {
      title: 'NF',
      dataIndex: 'notaFiscal',
      key: 'notaFiscal',
      width: 120,
      render: (_, record) => (
        <Text style={{ color: record.deletedAt ? '#8c8c8c' : undefined }}>
          {formatIdentifier(record.notaFiscal)}
        </Text>
      ),
    },
    {
      title: 'Transportadora',
      dataIndex: 'transportadora',
      key: 'transportadora',
      width: 170,
      render: (value, record) => (
        <Text style={{ color: record.deletedAt ? '#8c8c8c' : undefined }}>{value || '-'}</Text>
      ),
    },
    {
      title: 'Destinatário',
      dataIndex: 'destinatario',
      key: 'destinatario',
      width: 230,
      ellipsis: true,
      render: (value, record) => (
        <Text style={{ color: record.deletedAt ? '#8c8c8c' : undefined }}>{value || '-'}</Text>
      ),
    },
    {
      title: 'Destino',
      key: 'destino',
      width: 170,
      render: (_, record) => (
        <Text style={{ color: record.deletedAt ? '#8c8c8c' : undefined }}>
          {[record.cidadeDestino, record.ufDestino].filter(Boolean).join(' / ') || '-'}
        </Text>
      ),
    },
    {
      title: 'Status Entrega',
      dataIndex: 'statusEntrega',
      key: 'statusEntrega',
      width: 140,
      render: (_, record) => statusEntregaTag(record.statusEntrega, record),
    },
    {
      title: 'Valor NF',
      dataIndex: 'nfValor',
      key: 'nfValor',
      width: 140,
      align: 'right',
      render: (value, record) => (
        <Text style={{ color: record.deletedAt ? '#8c8c8c' : undefined }}>{formatMoney(value)}</Text>
      ),
    },
    {
      title: 'Frete',
      dataIndex: 'frete',
      key: 'frete',
      width: 120,
      align: 'right',
      render: (value, record) => (
        <Text style={{ color: record.deletedAt ? '#8c8c8c' : undefined }}>{formatMoney(value)}</Text>
      ),
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 220,
      fixed: isMobile ? undefined : 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="Visualizar">
            <Button
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedId(record.id);
                setOpenDetails(true);
              }}
            />
          </Tooltip>

          <Tooltip title="Histórico">
            <Button
              icon={<HistoryOutlined />}
              onClick={() => {
                setSelectedId(record.id);
                setOpenHistory(true);
              }}
            />
          </Tooltip>

          {canCreateEdit ? (
            <Tooltip title="Editar">
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  setSelectedId(record.id);
                  setEditingRecord(record);
                  drawerForm.setFieldsValue(mapRecordToFormValues(record));
                  setOpenForm(true);
                }}
              />
            </Tooltip>
          ) : null}

          {canDeleteRestore && !record.deletedAt ? (
            <Tooltip title="Excluir">
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending}
                onClick={() => {
                  Modal.confirm({
                    title: 'Excluir CTE',
                    content: `Deseja excluir o CTE ${formatIdentifier(record.cte || `#${record.id}`)}?`,
                    okText: 'Excluir',
                    okButtonProps: { danger: true },
                    cancelText: 'Cancelar',
                    onOk: () => deleteMutation.mutate({ id: record.id }),
                  });
                }}
              />
            </Tooltip>
          ) : null}

          {canDeleteRestore && record.deletedAt ? (
            <Tooltip title="Restaurar">
              <Button
                icon={<RollbackOutlined />}
                loading={restoreMutation.isPending}
                onClick={() => {
                  Modal.confirm({
                    title: 'Restaurar CTE',
                    content: `Deseja restaurar o CTE ${formatIdentifier(record.cte || `#${record.id}`)}?`,
                    okText: 'Restaurar',
                    cancelText: 'Cancelar',
                    onOk: () => restoreMutation.mutate({ id: record.id }),
                  });
                }}
              />
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
  ];

  const historyColumns: ColumnsType<DeliveryReportHistory> = [
    {
      title: 'Data',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (value) => formatDateTime(value),
    },
    {
      title: 'Ação',
      dataIndex: 'actionType',
      key: 'actionType',
      width: 120,
      render: (value) => actionTag(value),
    },
    {
      title: 'Campo',
      dataIndex: 'fieldName',
      key: 'fieldName',
      width: 160,
      render: (value) => value || '-',
    },
    {
      title: 'Valor anterior',
      dataIndex: 'oldValue',
      key: 'oldValue',
      width: 220,
      render: (value) => value || '-',
    },
    {
      title: 'Valor novo',
      dataIndex: 'newValue',
      key: 'newValue',
      width: 220,
      render: (value) => value || '-',
    },
    {
      title: 'Responsável',
      key: 'performedByName',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.performedByName || record.performedByUser?.name || '-'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.performedByProfile || record.performedByUser?.email || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Observação',
      dataIndex: 'comments',
      key: 'comments',
      width: 250,
      render: (value) => value || '-',
    },
  ];

  const resumoRegionalColumns: ColumnsType<any> = [
    {
      title: 'Regional',
      dataIndex: 'regiao',
      key: 'regiao',
      width: 320,
      render: (_, record) => {
        if (record.isGroup || record.isTotal) {
          return (
            <Text
              strong
              style={{
                color: '#0f172a',
                fontSize: 14,
                letterSpacing: 0.2,
              }}
            >
              {record.regiao}
            </Text>
          );
        }

        return (
          <div style={{ paddingLeft: 26 }}>
            <Text
              style={{
                color: '#475569',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {record.operacao}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Valor NF',
      dataIndex: 'nf',
      key: 'nf',
      width: 170,
      align: 'right',
      render: (value, record) => (
        <Text
          strong={!!record.isGroup || !!record.isTotal}
          style={{
            color: '#0f172a',
            fontSize: record.isTotal ? 14 : 13,
            fontWeight: record.isTotal ? 800 : record.isGroup ? 700 : 600,
          }}
        >
          {normalizeCurrency(value).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      ),
    },
    {
      title: 'Valor Frete',
      dataIndex: 'frete',
      key: 'frete',
      width: 170,
      align: 'right',
      render: (value, record) => (
        <Text
          strong={!!record.isGroup || !!record.isTotal}
          style={{
            color: '#0f172a',
            fontSize: record.isTotal ? 14 : 13,
            fontWeight: record.isTotal ? 800 : record.isGroup ? 700 : 600,
          }}
        >
          {normalizeCurrency(value).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      ),
    },
    {
      title: 'Percentual Frete',
      dataIndex: 'percentualFrete',
      key: 'percentualFrete',
      width: 180,
      align: 'center',
      render: (value, record) => {
        const numeric = Number(value || 0);

        return (
          <Tag
            style={{
              borderRadius: 999,
              paddingInline: 10,
              fontWeight: 700,
              fontSize: 12,
              border: '1px solid #dbeafe',
              background: record.isTotal
                ? 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)'
                : 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
              color: '#1e3a8a',
            }}
          >
            {formatPercent(numeric, 2)}
          </Tag>
        );
      },
    },
  ];

  const monthsColumns: ColumnsType<any> = [
    {
      title: 'Mês',
      dataIndex: 'month',
      key: 'month',
      render: (_, record) => `${record.month} / ${record.year}`,
    },
    {
      title: 'NF R$',
      dataIndex: 'nf',
      key: 'nf',
      align: 'right',
      render: (value) => formatMoney(value),
    },
    {
      title: 'Frete R$',
      dataIndex: 'frete',
      key: 'frete',
      align: 'right',
      render: (value) => formatMoney(value),
    },
    {
      title: 'Armazém R$',
      dataIndex: 'armazenagem',
      key: 'armazenagem',
      align: 'right',
      render: (value) => formatMoney(value),
    },
    {
      title: 'Gastos R$',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (value) => formatMoney(value),
    },
    {
      title: '%Frete',
      dataIndex: 'percentualFrete',
      key: 'percentualFrete',
      align: 'right',
      render: (value) => formatPercent(value),
    },
    {
      title: '%Total',
      dataIndex: 'percentualTotal',
      key: 'percentualTotal',
      align: 'right',
      render: (value) => formatPercent(value),
    },
  ];

  const selectedDetails = detailsQuery.data || null;

  const handleSearch = () => {
    const values = filterForm.getFieldsValue();

    let startDate = values.period?.[0]
      ? dayjs(values.period[0]).startOf('day').toISOString()
      : undefined;

    let endDate = values.period?.[1]
      ? dayjs(values.period[1]).endOf('day').toISOString()
      : undefined;

    if (values.quarter) {
      const selectedYear =
        yearFilter !== 'all' ? Number(yearFilter) : dayjs().year();

      const quarterRange = getQuarterRange(selectedYear, values.quarter);

      if (quarterRange) {
        startDate = quarterRange[0].startOf('day').toISOString();
        endDate = quarterRange[1].endOf('day').toISOString();
      }
    }

    let deletedFilter: 'active' | 'all' | 'only' = 'all';
    if (values.deletedFilter === 'active') deletedFilter = 'active';
    if (values.deletedFilter === 'only') deletedFilter = 'only';

    setPage(1);
    setQuickView('all');

  setFilters((prev) => ({
    ...prev,
    search: values.search?.trim() || undefined,
    cte: values.cte?.trim() || undefined,
    notaFiscal: values.notaFiscal?.trim() || undefined,
    transportadora: values.transportadora || undefined,
    statusEntrega: values.statusEntrega || undefined,
    operacao: values.operacao || undefined,
    quarter: values.quarter || undefined,
    deletedFilter,
    cancelledMode: 'all',
    startDate,
    endDate,
  }));

  setTimeout(() => {
    qc.invalidateQueries({ queryKey: ['delivery-reports'] });
    qc.invalidateQueries({ queryKey: ['delivery-reports-summary-all'] });
  }, 0);
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setPage(1);
    setQuickView('all');
    setYearFilter(defaultYearValue);

    setFilters({
      deletedFilter: 'all',
      cancelledMode: 'all',
      search: undefined,
      cte: undefined,
      notaFiscal: undefined,
      transportadora: undefined,
      statusEntrega: undefined,
      operacao: undefined,
      quarter: undefined,
      startDate: undefined,
      endDate: undefined,
    });

    filterForm.setFieldsValue({
      search: undefined,
      cte: undefined,
      notaFiscal: undefined,
      transportadora: undefined,
      statusEntrega: undefined,
      operacao: undefined,
      quarter: undefined,
      period: undefined,
      deletedFilter: 'all',
    });
  };

  const handleOpenNew = () => {
    setEditingRecord(null);
    setSelectedId(null);
    drawerForm.resetFields();
    drawerForm.setFieldsValue({
      statusEntrega: 'PENDENTE',
      modal: 'RODOVIARIO',
    });
    setOpenForm(true);
  };

  const handleSubmitForm = async () => {
    try {
      const values = await drawerForm.validateFields();
      const payload = mapFormToPayload(values);
      if (editingRecord?.id) {
        updateMutation.mutate({ id: editingRecord.id, payload });
      } else {
        createMutation.mutate(payload);
      }
    } catch {}
  };

  const importProgress =
    importStatus?.progress ?? (importStage === 'uploading' ? uploadProgress : importStage === 'done' ? 100 : 0);

  const importInserted = Number(importStatus?.inserted || 0);
  const importUpdated = Number(importStatus?.updated || 0);
  const importIgnored = Number(importStatus?.ignored || 0);
  const importProcessed = Number(importStatus?.processed || 0);
  const shouldShowImportSelector = importStage === 'idle';
  const importTotalLinhas = Number(importStatus?.totalLinhas || 0);
  const importErrorsCount = Number(importStatus?.errors?.length || 0);

  const yearFilterLabel = yearFilter === 'all' ? 'Total' : yearFilter;

  const importPreviewColumns: ColumnsType<ImportPreviewRow> = [
    { title: 'CTE', dataIndex: 'cte', key: 'cte', width: 110, render: (value) => value || '-' },
    { title: 'NF', dataIndex: 'notaFiscal', key: 'notaFiscal', width: 110, render: (value) => value || '-' },
    { title: 'Transportadora', dataIndex: 'transportadora', key: 'transportadora', width: 150, render: (value) => value || '-' },
    { title: 'Operação', dataIndex: 'operacao', key: 'operacao', width: 180, render: (value) => value || '-' },
    { title: 'Resumo operação', dataIndex: 'operacaoResumo', key: 'operacaoResumo', width: 180, render: (value) => value || '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 150, render: (value) => value || '-' },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card variant={false} styles={{ body: { paddingBottom: 18 } }}>
          <Row justify="space-between" align="middle" gutter={[12, 12]}>
            <Col>
              <Space direction="vertical" size={2}>
                <Title level={3} style={{ margin: 0 }}>
                  CTE / Relatório de Entregas
                </Title>
                <Text type="secondary">
                  Gestão de CTEs, acompanhamento logístico, histórico e auditoria.
                </Text>
              </Space>
            </Col>

            <Col>
              <Space wrap align="center">
                <Text type="secondary">Visão:</Text>

                <Select
                  value={yearFilter}
                  onChange={(value: YearFilterValue) => {
                    setYearFilter(value);
                    setPage(1);

                    setFilters((prev) => ({
                      ...prev,
                      startDate: undefined,
                      endDate: undefined,
                    }));

                    filterForm.setFieldsValue({
                      period: undefined,
                    });
                  }}
                  style={{ width: 150 }}
                  options={[{ label: 'Total', value: 'all' }, ...yearOptions]}
                />

                <Select
                  value={quickView}
                  onChange={(value: QuickViewFilter) => {
                    setQuickView(value);
                    setPage(1);

                    if (value === 'all') {
                      setFilters((prev) => ({
                        ...prev,
                        deletedFilter: prev.deletedFilter || 'all',
                        cancelledMode: prev.cancelledMode || 'all',
                      }));
                      return;
                    }

                    if (value === 'deleted') {
                      setFilters((prev) => ({
                        ...prev,
                        deletedFilter: 'only',
                      }));
                      return;
                    }

                    if (value === 'cancelled') {
                      setFilters((prev) => ({
                        ...prev,
                        deletedFilter: prev.deletedFilter || 'all',
                        cancelledMode: 'only',
                      }));
                      return;
                    }

                    if (value === 'delivered' || value === 'delayed') {
                      setFilters((prev) => ({
                        ...prev,
                        deletedFilter: prev.deletedFilter || 'all',
                        cancelledMode: prev.cancelledMode || 'all',
                      }));
                    }
                  }}
                  style={{ width: 180 }}
                  options={[
                    { label: 'Todas', value: 'all' },
                    { label: 'Canceladas', value: 'cancelled' },
                    { label: 'Entregues', value: 'delivered' },
                    { label: 'Atrasadas', value: 'delayed' },
                    { label: 'Excluídas', value: 'deleted' },
                  ]}
                />

                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    qc.invalidateQueries({ queryKey: ['delivery-reports'] });
                    qc.invalidateQueries({ queryKey: ['delivery-reports-summary-all'] });
                    if (selectedId) {
                      qc.invalidateQueries({ queryKey: ['delivery-report-details', selectedId] });
                      qc.invalidateQueries({ queryKey: ['delivery-report-history', selectedId] });
                    }
                  }}
                >
                  Atualizar
                </Button>

                <Button icon={<DownloadOutlined />} loading={exporting} onClick={() => setOpenExport(true)}>
                  Exportar
                </Button>
              <Button
                icon={<BarChartOutlined />}
                onClick={() => setShowResumo((prev) => !prev)}
              >
                {showResumo ? 'Ocultar Indicadores' : 'Mostrar Indicadores'}
              </Button>
                <Button icon={<GlobalOutlined />} onClick={() => setOpenResumoModal(true)}>
                  Resumo
                </Button>

                <Button icon={<BarChartOutlined />} onClick={() => setOpenPainelModal(true)}>
                  Painel
                </Button>

                <Button icon={<UploadOutlined />} onClick={() => setOpenImport(true)}>
                  Importar Excel
                </Button>

                {canCreateEdit ? (
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenNew}>
                    Novo CTE
                  </Button>
                ) : null}
              </Space>
            </Col>
          </Row>
        </Card>
        {showResumo && (
        <Row gutter={[18, 18]}>
          <Col xs={24} md={12} xl={8}>
            <Card
              variant={false}
              style={{
                borderRadius: 22,
                border: '1px solid #e8edf5',
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
                background: '#fff',
                height: '100%',
              }}
              styles={{ body: { padding: 22 } }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  marginBottom: 18,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      color: '#64748b',
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    Carga Transportada
                  </div>

                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: 800,
                      color: '#0f172a',
                      lineHeight: 1.1,
                    }}
                  >
                    {formatNumber(resumoPeso.totalPeso, 0)} kg
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: '#94a3b8',
                    }}
                  >
                    Peso total transportado
                  </div>
                </div>

                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#e0f2fe',
                    color: '#0ea5e9',
                    border: '1px solid #bae6fd',
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  <CarOutlined />
                </div>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 16,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      Volumes
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
                      {resumoPeso.totalVolumes.toLocaleString('pt-BR')}
                    </div>
                  </div>
                </Col>

                <Col span={12}>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 16,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      Registros
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
                      {resumoPeso.totalRegistros.toLocaleString('pt-BR')}
                    </div>
                  </div>
                </Col>
              </Row>

              <div
                style={{
                  marginTop: 18,
                  height: 6,
                  borderRadius: 999,
                  background: '#e0f2fe',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
                  }}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} md={12} xl={8}>
            <Card
              variant={false}
              style={{
                borderRadius: 22,
                border: '1px solid #e8edf5',
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
                background: '#fff',
                height: '100%',
              }}
              styles={{ body: { padding: 22 } }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  marginBottom: 18,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      color: '#64748b',
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    SLA de Entrega
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: '#94a3b8',
                    }}
                  >
                    Performance logística
                  </div>
                </div>

                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#dcfce7',
                    color: '#16a34a',
                    border: '1px solid #bbf7d0',
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  <CheckCircleOutlined />
                </div>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: 16,
                      background: '#f0fdf4',
                      border: '1px solid #dcfce7',
                      height: '100%',
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      No prazo
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a' }}>
                      {summary.delivered.toLocaleString('pt-BR')}
                    </div>
                  </div>
                </Col>

                <Col span={12}>
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: 16,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      height: '100%',
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      Fora do prazo
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>
                      {summary.delayed.toLocaleString('pt-BR')}
                    </div>
                  </div>
                </Col>
              </Row>

              <div
                style={{
                  marginTop: 18,
                  height: 6,
                  borderRadius: 999,
                  background: '#dcfce7',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                  }}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} md={12} xl={8}>
            <Card
              variant={false}
              style={{
                borderRadius: 22,
                border: '1px solid #e8edf5',
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
                background: '#fff',
                height: '100%',
              }}
              styles={{ body: { padding: 22 } }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  marginBottom: 18,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      color: '#64748b',
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    Valor NF
                  </div>

                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: 800,
                      color: '#0f172a',
                      lineHeight: 1.1,
                    }}
                  >
                    {formatMoney(summary.totalValorNF)}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: '#94a3b8',
                    }}
                  >
                    Total das notas fiscais
                  </div>
                </div>

                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#dff7f4',
                    color: '#0f766e',
                    border: '1px solid #b7e4dd',
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  <DollarCircleOutlined />
                </div>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 16,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      Frete Total
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#7c3aed' }}>
                      {formatMoney(summary.totalFrete)}
                    </div>
                  </div>
                </Col>

                <Col span={12}>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 16,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      % Frete
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#db2777' }}>
                      {formatPercent(summary.percentualFreteSobreNF, 2)}
                    </div>
                  </div>
                </Col>
              </Row>

              <div
                style={{
                  marginTop: 18,
                  height: 6,
                  borderRadius: 999,
                  background: '#dff7f4',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #0f766e, #14b8a6)',
                  }}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} md={12} xl={8}>
            <SummaryCard
              title="Frete Médio"
              value={summary.freteMedio}
              prefix="R$"
              precision={2}
              subtitle="Média por CTE"
              icon={<CheckCircleOutlined />}
              accent="#f59e0b"
            />
          </Col>
          <Col xs={24} md={12} xl={8}>
            <SummaryCard
              title="Frete Total"
              value={summary.totalFrete}
              prefix="R$"
              precision={2}
              subtitle="Total transporte"
              icon={<CarOutlined />}
              accent="#7c3aed"
            />
          </Col>
          <Col xs={24} md={12} xl={8}>
            <SummaryCard
              title="% Frete sobre NF"
              value={summary.percentualFreteSobreNF}
              suffix="%"
              precision={2}
              subtitle="Custo sobre NF"
              icon={<PercentageOutlined />}
              accent="#db2777"
            />
          </Col>
        </Row>
        )}
        <Card variant={false} title="Filtros">
          <Form
            form={filterForm}
            layout="vertical"
            onFinish={handleSearch}
            initialValues={{ deletedFilter: 'all' }}
          >
            <Row gutter={[12, 0]}>
              <Col xs={24} md={12} lg={4}>
                <Form.Item name="search" label="Busca geral">
                  <Input placeholder="CTE, NF, destinatário, remetente..." allowClear />
                </Form.Item>
              </Col>

              <Col xs={24} md={8} lg={2}>
                <Form.Item name="transportadora" label="Transportadora">
                  <Select
                    placeholder="Selecione"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={transportadoraOptions}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8} lg={2}>
                <Form.Item name="statusEntrega" label="Status Entrega">
                  <Select
                    placeholder="Selecione"
                    allowClear
                    options={STATUS_ENTREGA_OPTIONS.map((value) => ({ label: value, value }))}
                  />
                </Form.Item>
              </Col>


              <Col xs={24} md={10} lg={5}>
                <Form.Item name="period" label="Período de emissão">
                  <RangePicker
                    style={{ width: '100%' }}
                    format="DD/MM/YYYY"
                    locale={ptBR}
                    placeholder={['Data inicial', 'Data final']}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8} lg={3}>
                <Form.Item name="quarter" label="Trimestre">
                  <Select
                    placeholder="Selecione"
                    allowClear
                    options={QUARTER_OPTIONS}
                    onChange={(value) => {
                      if (!value) return;

                      const selectedYear =
                        yearFilter !== 'all' ? Number(yearFilter) : dayjs().year();

                      const quarterRange = getQuarterRange(selectedYear, value);

                      if (quarterRange) {
                        filterForm.setFieldsValue({
                          period: quarterRange,
                        });
                      }
                    }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8} lg={3}>
                <Form.Item name="deletedFilter" label="Registros">
                  <Select
                    options={[
                      { label: 'Somente ativos', value: 'active' },
                      { label: 'Ativos + excluídos', value: 'all' },
                      { label: 'Somente excluídos', value: 'only' },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Space wrap>
                <Button type="primary" icon={<SearchOutlined />} htmlType="submit" loading={listQuery.isFetching}>
                  Pesquisar
                </Button>
                <Button onClick={handleResetFilters}>Limpar filtros</Button>
              </Space>
            </Row>
          </Form>
        </Card>

        <Card
          variant={false}
          title="Lista de CTEs"
          extra={
            <Text type="secondary">
              Visão: <strong>{yearFilterLabel}</strong>
              &nbsp;|&nbsp; Rápido: <strong>{quickView}</strong>
              &nbsp;|&nbsp; Total: <strong>{total}</strong>
            </Text>
          }
          styles={{ body: { paddingTop: 12, overflowX: 'hidden' } }}
        >
          <Spin spinning={listQuery.isLoading || listQuery.isFetching}>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <Table
                rowKey="id"
                columns={columns}
                dataSource={rows}
                pagination={false}
                size="middle"
                scroll={{ x: 'max-content' }}
                rowClassName={(record) => (record.deletedAt ? 'delivery-report-row-deleted' : '')}
                locale={{ emptyText: <Empty description="Nenhum CTE encontrado" /> }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                showSizeChanger
                showTotal={(value) => `Total de ${value} registros`}
                onChange={(newPage, newPageSize) => {
                  setPage(newPage);
                  setPageSize(newPageSize);
                }}
              />
            </div>
          </Spin>
        </Card>

        <style>
          {`
            .delivery-report-row-deleted td {
              background: #fafafa !important;
            }

            .delivery-report-row-deleted td:first-child {
              border-left: 4px solid #ff4d4f;
            }

            .mini-bar-row {
              display: flex;
              align-items: center;
              gap: 10px;
              width: 100%;
            }

            .mini-bar-label {
              width: 110px;
              min-width: 110px;
              font-size: 12px;
              color: #334155;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .mini-bar-track {
              flex: 1;
              height: 10px;
              border-radius: 999px;
              background: #e2e8f0;
              overflow: hidden;
            }

            .mini-bar-fill {
              height: 100%;
              border-radius: 999px;
            }

            .mini-bar-value {
              min-width: 90px;
              text-align: right;
              font-size: 12px;
              color: #0f172a;
              font-weight: 600;
            }

            .resumo-regional-table {
              border-radius: 18px;
              overflow: hidden;
            }

            .resumo-regional-table .ant-table {
              background: transparent !important;
              border-radius: 18px;
              overflow: hidden;
            }

            .resumo-regional-table .ant-table-container {
              border: 1px solid #e2e8f0;
              border-radius: 18px;
              overflow: hidden;
              background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
              box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
            }

            .resumo-regional-table .ant-table-thead > tr > th {
              background: linear-gradient(180deg, #f8fbff 0%, #f1f5f9 100%) !important;
              color: #334155 !important;
              text-align: center;
              font-weight: 700;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              border-bottom: 1px solid #e2e8f0 !important;
              border-inline-end: none !important;
              padding-top: 14px !important;
              padding-bottom: 14px !important;
            }

            .resumo-regional-table .ant-table-tbody > tr > td {
              border-bottom: 1px solid #eef2f7 !important;
              border-inline-end: none !important;
              padding-top: 12px !important;
              padding-bottom: 12px !important;
              transition: background 0.2s ease, transform 0.2s ease;
            }

            .resumo-regional-table .row-group td {
              background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%) !important;
              color: #0f172a !important;
              font-weight: 700;
              border-top: 1px solid #e2e8f0 !important;
              border-bottom: 1px solid #dbeafe !important;
            }

            .resumo-regional-table .row-child td {
              background: #ffffff !important;
              color: #475569 !important;
            }

            .resumo-regional-table .row-child td:first-child {
              position: relative;
            }

            .resumo-regional-table .row-child td:first-child::before {
              content: "";
              position: absolute;
              left: 10px;
              top: 50%;
              transform: translateY(-50%);
              width: 6px;
              height: 6px;
              border-radius: 999px;
              background: #cbd5e1;
            }

            .resumo-regional-table .row-total td {
              background: linear-gradient(180deg, #eff6ff 0%, #e0f2fe 100%) !important;
              color: #0f172a !important;
              font-weight: 800;
              border-top: 2px solid #93c5fd !important;
              border-bottom: none !important;
            }

            .resumo-regional-table .row-group:hover td,
            .resumo-regional-table .row-child:hover td,
            .resumo-regional-table .row-total:hover td {
              background-clip: padding-box !important;
            }

            .resumo-regional-table .row-child:hover td {
              background: #f8fafc !important;
            }

            .resumo-regional-table .ant-table-cell {
              vertical-align: middle !important;
            }
          `}
        </style>

        <Modal
          title={editingRecord ? `Editar CTE ${formatIdentifier(editingRecord.cte || `#${editingRecord.id}`)}` : 'Novo CTE'}
          open={openForm}
          onCancel={() => {
            setOpenForm(false);
            setEditingRecord(null);
            drawerForm.resetFields();
          }}
          onOk={handleSubmitForm}
          okText={editingRecord ? 'Salvar alterações' : 'Cadastrar'}
          cancelText="Cancelar"
          width={1100}
          confirmLoading={createMutation.isPending || updateMutation.isPending}
          destroyOnHidden
        >
          <Form form={drawerForm} layout="vertical">
            <Row gutter={[12, 0]}>
              <Col xs={24} md={6}>
                <Form.Item name="cte" label="CTE" rules={[{ required: true, message: 'Informe o CTE' }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="notaFiscal" label="Nota Fiscal">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="transportadora" label="Transportadora">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="tipo" label="Tipo">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="modal" label="Modal">
                  <Select allowClear options={MODAL_OPTIONS.map((value) => ({ label: value, value }))} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="statusEntrega" label="Status Entrega">
                  <Select allowClear options={STATUS_ENTREGA_OPTIONS.map((value) => ({ label: value, value }))} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="operacao" label="Operação">
                  <Select allowClear options={OPERACAO_OPTIONS.map((value) => ({ label: value, value }))} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="regiao" label="Região">
                  <Select allowClear options={REGIAO_OPTIONS.map((value) => ({ label: value, value }))} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="remetente" label="Remetente">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="destinatario" label="Destinatário">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="encomenda" label="Encomenda">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="cidadeOrigem" label="Cidade Origem">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={3}>
                <Form.Item name="ufOrigem" label="UF Origem">
                  <Input maxLength={2} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="cidadeDestino" label="Cidade Destino">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={3}>
                <Form.Item name="ufDestino" label="UF Destino">
                  <Input maxLength={2} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="status" label="Status Geral">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="emissaoData" label="Data de Emissão">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="previsaoEntrega" label="Previsão Entrega">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="dataEntrega" label="Data Entrega">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="ultimaAtualizacao" label="Última Atualização">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item name="nfValor" label="Valor NF">
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item name="frete" label="Frete">
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item name="pesoReal" label="Peso Real">
                  <InputNumber style={{ width: '100%' }} min={0} precision={3} />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item name="pesoCubado" label="Peso Cubado">
                  <InputNumber style={{ width: '100%' }} min={0} precision={3} />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item name="pesoTaxado" label="Peso Taxado">
                  <InputNumber style={{ width: '100%' }} min={0} precision={3} />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item name="volume" label="Volume">
                  <InputNumber style={{ width: '100%' }} min={0} precision={3} />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item name="icmsPercent" label="ICMS %">
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item name="icmsValor" label="ICMS Valor">
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item name="indice" label="Índice">
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="cteNovo" label="CTE Novo">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="operacaoResumo" label="Resumo Operação">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="reentregaDevolucao" label="Reentrega/Devolução">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="comments" label="Observação da alteração">
                  <Input.TextArea rows={3} placeholder="Observação opcional para o histórico" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>

        <Modal
          title={`Detalhes do CTE ${formatIdentifier(selectedDetails?.cte)}`}
          open={openDetails}
          onCancel={() => setOpenDetails(false)}
          footer={null}
          width={1100}
          destroyOnHidden
        >
          <Spin spinning={detailsQuery.isLoading || detailsQuery.isFetching}>
            {!selectedDetails ? (
              <Empty description="Selecione um CTE para visualizar" />
            ) : (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={6}>
                    <IdentifierCard title="CTE" value={selectedDetails.cte} />
                  </Col>
                  <Col xs={24} md={6}>
                    <IdentifierCard title="NF" value={selectedDetails.notaFiscal} />
                  </Col>
                  <Col xs={24} md={6}>
                    <Card variant={false} size="small">
                      <Text type="secondary">Valor NF</Text>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{formatMoney(selectedDetails.nfValor)}</div>
                    </Card>
                  </Col>
                  <Col xs={24} md={6}>
                    <Card variant={false} size="small">
                      <Text type="secondary">Frete</Text>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{formatMoney(selectedDetails.frete)}</div>
                    </Card>
                  </Col>
                </Row>

                <Card variant={false} size="small" title="Dados principais">
                  <Descriptions variant size="small" column={isMobile ? 1 : 2}>
                    <Descriptions.Item label="CTE">{formatIdentifier(selectedDetails.cte)}</Descriptions.Item>
                    <Descriptions.Item label="CTE Novo">{formatIdentifier(selectedDetails.cteNovo)}</Descriptions.Item>
                    <Descriptions.Item label="Emissão">{formatDate(selectedDetails.emissaoData || selectedDetails.emissao)}</Descriptions.Item>
                    <Descriptions.Item label="Transportadora">{selectedDetails.transportadora || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Tipo">{selectedDetails.tipo || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Modal">{selectedDetails.modal || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Operação">{selectedDetails.operacao || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Resumo Operação">{selectedDetails.operacaoResumo || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Região">{selectedDetails.regiao || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Status">{selectedDetails.status || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Status Entrega">{statusEntregaTag(selectedDetails.statusEntrega, selectedDetails)}</Descriptions.Item>
                    <Descriptions.Item label="Remetente">{selectedDetails.remetente || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Destinatário">{selectedDetails.destinatario || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Origem">
                      {[selectedDetails.cidadeOrigem, selectedDetails.ufOrigem].filter(Boolean).join(' / ') || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Destino">
                      {[selectedDetails.cidadeDestino, selectedDetails.ufDestino].filter(Boolean).join(' / ') || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Nota Fiscal">{formatIdentifier(selectedDetails.notaFiscal)}</Descriptions.Item>
                    <Descriptions.Item label="Valor NF">{formatMoney(selectedDetails.nfValor)}</Descriptions.Item>
                    <Descriptions.Item label="Frete">{formatMoney(selectedDetails.frete)}</Descriptions.Item>
                    <Descriptions.Item label="Volume">{formatNumber(selectedDetails.volume, 3)}</Descriptions.Item>
                    <Descriptions.Item label="Peso Real">{formatNumber(selectedDetails.pesoReal, 3)}</Descriptions.Item>
                    <Descriptions.Item label="Peso Cubado">{formatNumber(selectedDetails.pesoCubado, 3)}</Descriptions.Item>
                    <Descriptions.Item label="Peso Taxado">{formatNumber(selectedDetails.pesoTaxado, 3)}</Descriptions.Item>
                    <Descriptions.Item label="ICMS %">{formatNumber(selectedDetails.icmsPercent, 2)}</Descriptions.Item>
                    <Descriptions.Item label="ICMS Valor">{formatMoney(selectedDetails.icmsValor)}</Descriptions.Item>
                    <Descriptions.Item label="Previsão Entrega">{formatDate(selectedDetails.previsaoEntrega)}</Descriptions.Item>
                    <Descriptions.Item label="Data Entrega">{formatDate(selectedDetails.dataEntrega)}</Descriptions.Item>
                    <Descriptions.Item label="Última Atualização">{formatDateTime(selectedDetails.ultimaAtualizacao)}</Descriptions.Item>
                    <Descriptions.Item label="Encomenda">{selectedDetails.encomenda || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Reentrega/Devolução">{selectedDetails.reentregaDevolucao || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Índice">{selectedDetails.indice ?? '-'}</Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card variant={false} size="small" title="Auditoria">
                  <Descriptions variant size="small" column={isMobile ? 1 : 2}>
                    <Descriptions.Item label="Criado por">{selectedDetails.createdBy?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Criado em">{formatDateTime(selectedDetails.createdAt)}</Descriptions.Item>
                    <Descriptions.Item label="Última edição por">{selectedDetails.updatedBy?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Última edição em">{formatDateTime(selectedDetails.updatedAt)}</Descriptions.Item>
                    <Descriptions.Item label="Excluído por">{selectedDetails.deletedBy?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Excluído em">{formatDateTime(selectedDetails.deletedAt)}</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Space>
            )}
          </Spin>
        </Modal>

        <Modal
          title="Histórico do CTE"
          open={openHistory}
          onCancel={() => setOpenHistory(false)}
          footer={null}
          width={1200}
          destroyOnHidden
        >
          <Spin spinning={historyQuery.isLoading || historyQuery.isFetching}>
            <Table
              rowKey="id"
              columns={historyColumns}
              dataSource={historyQuery.data || []}
              pagination={{ pageSize: 8 }}
              scroll={{ x: 1300 }}
              locale={{ emptyText: <Empty description="Sem histórico para este CTE" /> }}
            />
          </Spin>
        </Modal>

        
<Modal
          title="Importar CTEs por Excel"
          open={openImport}
          onCancel={() => {
            if (importMutation.isPending) return;
            setOpenImport(false);
            resetImportState();
          }}
          footer={[
            <Button
              key="nova"
              onClick={() => resetImportState()}
              disabled={importMutation.isPending || importStage === 'processing' || importStage === 'queued'}
            >
              Nova importação
            </Button>,
            <Button key="fechar" onClick={() => { setOpenImport(false); resetImportState(); }}>
              Fechar
            </Button>,
            <Button
              key="importar"
              type="primary"
              loading={importMutation.isPending}
              disabled={!importFile || !!importJobId || importMutation.isPending}
              onClick={() => {
                if (!importFile) {
                  message.warning('Selecione um arquivo .xlsx para importar');
                  return;
                }
                if (!importJobId && !importMutation.isPending) {
                  importMutation.mutate(importFile);
                }
              }}
            >
              {importJobId ? 'Importação iniciada' : 'Importar'}
            </Button>,
          ]}
          width={1360}
          destroyOnHidden
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message="Importação otimizada"
              description="O arquivo é enviado uma única vez. O processamento pesado acontece no servidor, em lotes internos de 100 registros, para reduzir travamentos e melhorar o retorno."
            />

            <Row gutter={[16, 16]}>
              <Col xs={24} md={15}>
                <Card
                  size="small"
                  style={{
                    height: '100%',
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
                  }}
                  styles={{ body: { padding: 18 } }}
                >
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    {shouldShowImportSelector ? (
                      <>
                        <div>
                          <Text strong style={{ fontSize: 15 }}>
                            Arquivo da importação
                          </Text>
                          <div style={{ color: '#64748b', marginTop: 4, fontSize: 13 }}>
                            Selecione um arquivo .xlsx. Antes do envio, a tela lê uma pequena amostra da planilha. Depois do envio, os totais de inseridos, atualizados, ignorados e erros são atualizados em tempo real durante o processamento.
                          </div>
                        </div>

                        <Dragger
                          multiple={false}
                          maxCount={1}
                          disabled={importMutation.isPending || !!importJobId}
                          style={{ minHeight: 260, borderRadius: 14 }}
                          beforeUpload={(file) => {
                            const isExcel =
                              file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                              file.name.toLowerCase().endsWith('.xlsx');

                            if (!isExcel) {
                              message.error('Envie um arquivo .xlsx');
                              return Upload.LIST_IGNORE;
                            }

                            setImportFile(file as File);
                            setUploadProgress(0);
                            setImportStage('idle');
                            setImportJobId(null);
                            setImportStatus(null);
                            setImportLogs([]);
                            appendImportLog(`Arquivo pronto para importação: ${file.name}`, 'info');
                            void buildPreviewFromFile(file as File);
                            return false;
                          }}
                          onRemove={() => {
                            if (importMutation.isPending || !!importJobId) return false;
                            resetImportState();
                            return true;
                          }}
                          fileList={
                            importFile
                              ? [
                                  {
                                    uid: '1',
                                    name: importFile.name,
                                    status: importMutation.isPending || importStage === 'uploading' ? 'uploading' : 'done',
                                  } as any,
                                ]
                              : []
                          }
                        >
                          <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                          </p>
                          <p className="ant-upload-text">Clique ou arraste o arquivo Excel para esta área</p>
                          <p className="ant-upload-hint">Formato suportado: .xlsx</p>
                        </Dragger>
                      </>
                    ) : null}

                    {!shouldShowImportSelector ? (
                      <Card
                        variant={false}
                        size="small"
                        styles={{ body: { padding: 12 } }}
                        style={{ border: '1px solid #eef2f7', background: '#fafcff' }}
                      >
                        <Space direction="vertical" size={10} style={{ width: '100%' }}>
                          <Row justify="space-between" align="middle">
                            <Col>
                              <Text strong style={{ fontSize: 15 }}>Amostra da validação</Text>
                            </Col>
                            <Col>
                              {readingPreview ? <Tag color="processing">Lendo amostra...</Tag> : null}
                              {!readingPreview && importPreviewRows.length > 0 ? <Tag color="blue">{importPreviewRows.length} linha(s) em prévia</Tag> : null}
                            </Col>
                          </Row>

                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {importPreviewHeaders.length > 0
                              ? `Cabeçalhos identificados: ${importPreviewHeaders.join(' | ')}`
                              : 'Ao importar, será exibida aqui uma pequena amostra do que está sendo validado.'}
                          </Text>

                          {importPreviewRows.length > 0 ? (
                            <Table
                              rowKey="key"
                              columns={importPreviewColumns}
                              dataSource={importPreviewRows}
                              pagination={false}
                              size="small"
                              scroll={{ x: 1120, y: 360 }}
                            />
                          ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhuma amostra carregada ainda" />
                          )}
                        </Space>
                      </Card>
                    ) : null}

                    <Card
                      variant={false}
                      size="small"
                      styles={{ body: { padding: 12 } }}
                      style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}
                    >
                      <Row gutter={[12, 12]}>
                        <Col span={12}>
                          <Text type="secondary">Versão</Text>
                          <div style={{ fontWeight: 700, marginTop: 4, color: '#0f172a' }}>
                            {importStatus?.version || '-'}
                          </div>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary">Warnings</Text>
                          <div style={{ fontWeight: 700, marginTop: 4, color: '#d97706' }}>
                            {Number(importStatus?.warnings?.length || 0).toLocaleString('pt-BR')}
                          </div>
                        </Col>
                      </Row>
                    </Card>

                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={12}>
                        <Card variant={false} size="small" styles={{ body: { padding: 14 } }}>
                          <Text type="secondary">Arquivo</Text>
                          <div style={{ fontWeight: 700, marginTop: 6, color: '#0f172a' }}>
                            {importFile?.name || 'Nenhum arquivo selecionado'}
                          </div>
                        </Card>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Card variant={false} size="small" styles={{ body: { padding: 14 } }}>
                          <Text type="secondary">Job</Text>
                          <div style={{ fontWeight: 700, marginTop: 6, color: '#0f172a' }}>
                            {importJobId || '-'}
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={9}>
                <Card
                  size="small"
                  style={{
                    height: '100%',
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
                  }}
                  styles={{ body: { padding: 18 } }}
                >
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Space direction="vertical" size={0}>
                          <Text strong style={{ fontSize: 15 }}>
                            Retorno da importação
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Totais atualizados automaticamente durante o processamento
                          </Text>
                        </Space>
                      </Col>
                      <Col>
                        <Space>
                          {(importStage === 'processing' || importStage === 'queued') ? <Tag color="processing">Tempo real</Tag> : null}
                          <Tag color={getImportStageTagColor(importStage)}>
                            {getImportStageLabel(importStage)}
                          </Tag>
                        </Space>
                      </Col>
                    </Row>

                    <Progress
                      percent={importProgress}
                      strokeColor={importStage === 'error' ? '#ef4444' : '#1677ff'}
                      status={
                        importStage === 'error' ? 'exception' : importStage === 'done' ? 'success' : 'active'
                      }
                    />

                    <Text type="secondary">
                      {importStage === 'idle' && 'Selecione um arquivo e clique em importar.'}
                      {importStage === 'uploading' && 'Enviando o arquivo para o servidor...'}
                      {importStage === 'queued' && 'Arquivo recebido. Aguardando o job começar a processar.'}
                      {importStage === 'processing' &&
                        (importStatus?.message ||
                          `Processando ${importProcessed.toLocaleString('pt-BR')} de ${importTotalLinhas.toLocaleString('pt-BR')} linhas...`)}
                      {importStage === 'done' && (importStatus?.message || 'Importação concluída com sucesso.')}
                      {importStage === 'error' && (importStatus?.message || 'Falha ao importar a planilha.')}
                    </Text>

                    <Row gutter={[12, 12]}>
                      <Col xs={12}>
                        <Card variant={false} size="small" styles={{ body: { padding: 14 } }}>
                          <Space align="center" size={8}>
                            <PlusOutlined style={{ color: '#16a34a' }} />
                            <Text type="secondary">Inseridos</Text>
                          </Space>
                          <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
                            {importInserted.toLocaleString('pt-BR')}
                          </div>
                        </Card>
                      </Col>
                      <Col xs={12}>
                        <Card variant={false} size="small" styles={{ body: { padding: 14 } }}>
                          <Space align="center" size={8}>
                            <EditOutlined style={{ color: '#2563eb' }} />
                            <Text type="secondary">Atualizados</Text>
                          </Space>
                          <div style={{ fontSize: 24, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>
                            {importUpdated.toLocaleString('pt-BR')}
                          </div>
                        </Card>
                      </Col>
                      <Col xs={12}>
                        <Card variant={false} size="small" styles={{ body: { padding: 14 } }}>
                          <Space align="center" size={8}>
                            <FileTextOutlined style={{ color: '#f59e0b' }} />
                            <Text type="secondary">Ignorados</Text>
                          </Space>
                          <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>
                            {importIgnored.toLocaleString('pt-BR')}
                          </div>
                        </Card>
                      </Col>
                      <Col xs={12}>
                        <Card variant={false} size="small" styles={{ body: { padding: 14 } }}>
                          <Space align="center" size={8}>
                            <DeleteOutlined style={{ color: '#ef4444' }} />
                            <Text type="secondary">Erros</Text>
                          </Space>
                          <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', marginTop: 4 }}>
                            {importErrorsCount.toLocaleString('pt-BR')}
                          </div>
                        </Card>
                      </Col>
                    </Row>

                    <Card
                      variant={false}
                      size="small"
                      styles={{ body: { padding: 12 } }}
                      style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}
                    >
                      <Row gutter={[12, 12]}>
                        <Col span={12}>
                          <Text type="secondary">Linhas processadas</Text>
                          <div style={{ fontWeight: 700, marginTop: 4 }}>
                            {importProcessed.toLocaleString('pt-BR')}
                          </div>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary">Linhas do arquivo</Text>
                          <div style={{ fontWeight: 700, marginTop: 4 }}>
                            {importTotalLinhas.toLocaleString('pt-BR')}
                          </div>
                        </Col>
                      </Row>
                    </Card>

                    <div
                      ref={logsContainerRef}
                      style={{
                        maxHeight: 180,
                        overflowY: 'auto',
                        border: '1px solid #f0f0f0',
                        borderRadius: 10,
                        padding: 10,
                        background: '#fafafa',
                      }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        {importLogs.length === 0 ? (
                          <Text type="secondary">Nenhum log ainda.</Text>
                        ) : (
                          importLogs.map((log) => (
                            <Text
                              key={log.id}
                              type={
                                log.type === 'error'
                                  ? 'danger'
                                  : log.type === 'warning'
                                  ? 'warning'
                                  : undefined
                              }
                              style={{ fontSize: 12 }}
                            >
                              [{log.at}] {log.text}
                            </Text>
                          ))
                        )}
                      </Space>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Space>
        </Modal>

        <Modal
          title="Exportar CTEs"
          open={openExport}
          onCancel={() => setOpenExport(false)}
          onOk={handleExport}
          okText="Gerar Excel"
          cancelText="Cancelar"
          confirmLoading={exporting}
          width={900}
          destroyOnHidden
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Exportação com filtros"
            description="Escolha um período e aplique filtros para evitar exportações muito grandes."
          />

          <Form form={exportForm} layout="vertical" initialValues={{ deletedFilter: effectiveDeletedFilter }}>
            <Row gutter={[12, 0]}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="period"
                  label="Período de emissão"
                  rules={[{ required: true, message: 'Selecione o período para exportação' }]}
                >
                  <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>

              <Col xs={24} md={4}>
                <Form.Item name="cte" label="CTE">
                  <Input allowClear />
                </Form.Item>
              </Col>

              <Col xs={24} md={4}>
                <Form.Item name="notaFiscal" label="Nota Fiscal">
                  <Input allowClear />
                </Form.Item>
              </Col>

              <Col xs={12} md={8}>
                <Form.Item name="search" label="Busca geral">
                  <Input allowClear placeholder="CTE, NF, remetente, destinatário..." />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="transportadora" label="Transportadora">
                  <Select allowClear showSearch optionFilterProp="label" options={transportadoraOptions} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="statusEntrega" label="Status Entrega">
                  <Select allowClear options={STATUS_ENTREGA_OPTIONS.map((value) => ({ label: value, value }))} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="operacao" label="Operação">
                  <Select allowClear options={OPERACAO_OPTIONS.map((value) => ({ label: value, value }))} />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item name="regiao" label="Região">
                  <Select allowClear options={REGIAO_OPTIONS.map((value) => ({ label: value, value }))} />
                </Form.Item>
              </Col>

              <Col xs={24} md={3}>
                <Form.Item name="ufDestino" label="UF Destino">
                  <Input allowClear maxLength={2} />
                </Form.Item>
              </Col>

              <Col xs={24} md={7}>
                <Form.Item name="cidadeDestino" label="Cidade Destino">
                  <Input allowClear />
                </Form.Item>
              </Col>

              <Col xs={24} md={4}>
                <Form.Item name="limit" label="Máx. registros" initialValue={5000}>
                  <InputNumber min={1} max={50000} style={{ width: '100%' }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item name="deletedFilter" label="Registros">
                  <Select
                    options={[
                      { label: 'Somente ativos', value: 'active' },
                      { label: 'Ativos + excluídos', value: 'all' },
                      { label: 'Somente excluídos', value: 'only' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>

        <Modal
          title="Resumo Executivo"
          open={openResumoModal}
          onCancel={() => setOpenResumoModal(false)}
          footer={[
            <Button key="fechar" onClick={() => setOpenResumoModal(false)}>
              Fechar
            </Button>,
            <Button
              key="exportar"
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExportResumoRegional}
            >
              Extrair dados
            </Button>,
          ]}
          width={980}
          destroyOnHidden
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12} lg={8}>
                <SummaryCard
                  title="Total Valor NF"
                  value={dashboardData.totalNF}
                  prefix="R$"
                  precision={2}
                  icon={<DollarCircleOutlined />}
                  accent="#0f766e"
                />
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <SummaryCard
                  title="Total Frete"
                  value={dashboardData.totalFrete}
                  prefix="R$"
                  precision={2}
                  icon={<CarOutlined />}
                  accent="#2563eb"
                />
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <SummaryCard
                  title="% Frete"
                  value={dashboardData.percentualFrete}
                  suffix="%"
                  precision={2}
                  icon={<PercentageOutlined />}
                  accent="#db2777"
                />
              </Col>
            </Row>

              <Card
                variant={false}
                style={{
                  borderRadius: 20,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
                  overflow: 'hidden',
                  background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
                }}
                styles={{ body: { padding: 0 } }}
              >
              <Table
                className="resumo-regional-table"
                rowKey="key"
                columns={resumoRegionalColumns}
                dataSource={dashboardData.regionOperationRows}
                pagination={false}
                size="small"
                scroll={{ x: 840 }}
                rowClassName={(record: any) => {
                  if (record.isTotal) return 'row-total';
                  if (record.isGroup) return 'row-group';
                  return 'row-child';
                }}
              />
            </Card>
          </Space>
        </Modal>

        <Modal
          title="Painel Logístico"
          open={openPainelModal}
          onCancel={() => setOpenPainelModal(false)}
          footer={null}
          width={1400}
          style={{ top: 20 }}
          destroyOnHidden
        >
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} lg={6}>
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Card variant={false} size="small" styles={{ body: { padding: 14 } }}>
                    <Text type="secondary">Total Valor NF (R$)</Text>
                    <div style={{ fontSize: 30, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>
                      {dashboardData.totalNF.toLocaleString('pt-BR', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </Card>

                  <Row gutter={[10, 10]}>
                    <Col span={18}>
                      <Card variant={false} size="small" styles={{ body: { padding: 14 } }}>
                        <Text type="secondary">Gastos Frete (R$)</Text>
                        <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>
                          {dashboardData.totalFrete.toLocaleString('pt-BR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </div>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card variant={false} size="small" styles={{ body: { padding: 14, textAlign: 'center' } }}>
                        <Text type="secondary">%</Text>
                        <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>
                          {formatPercent(dashboardData.percentualFrete)}
                        </div>
                      </Card>
                    </Col>
                  </Row>

                  <Row gutter={[10, 10]}>
                    <Col span={18}>
                      <Card variant={false} size="small" styles={{ body: { padding: 14 } }}>
                        <Text type="secondary">Gastos Totais (R$)</Text>
                        <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>
                          {dashboardData.totalGastos.toLocaleString('pt-BR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </div>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card variant={false} size="small" styles={{ body: { padding: 14, textAlign: 'center' } }}>
                        <Text type="secondary">%</Text>
                        <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>
                          {formatPercent(dashboardData.percentualTotal)}
                        </div>
                      </Card>
                    </Col>
                  </Row>

                  <Row gutter={[10, 10]}>
                    <Col span={18}>
                      <Card variant={false} size="small" styles={{ body: { padding: 14 } }}>
                        <Text type="secondary">Gastos Armazém (R$)</Text>
                        <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>
                          {dashboardData.totalArmazenagem.toLocaleString('pt-BR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </div>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card variant={false} size="small" styles={{ body: { padding: 14, textAlign: 'center' } }}>
                        <Text type="secondary">%</Text>
                        <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>
                          {formatPercent(dashboardData.percentualArmazem)}
                        </div>
                      </Card>
                    </Col>
                  </Row>
                </Space>
              </Col>

              <Col xs={24} lg={18}>
                <Card variant={false} title="Resumo por Regional (R$)" styles={{ body: { paddingTop: 8 } }}>
                  <Table
                    rowKey="key"
                    columns={resumoRegionalColumns}
                    dataSource={dashboardData.regionOperationRows}
                    pagination={false}
                    size="small"
                    scroll={{ x: 900 }}
                    rowClassName={(record: any) => {
                      if (record.isTotal) return 'row-total';
                      if (record.isGroup) return 'row-group';
                      return 'row-child';
                    }}
                  />
                </Card>
              </Col>
            </Row>

            <Card variant={false} title="Valor Transportado (R$) e Gastos (%) por Meses">
              {dashboardData.months.length === 0 ? (
                <Empty description="Sem dados por mês" />
              ) : (
                <Table
                  rowKey="key"
                  columns={monthsColumns}
                  dataSource={dashboardData.months}
                  pagination={false}
                  size="small"
                  scroll={{ x: 900 }}
                />
              )}
            </Card>

            <Row gutter={[12, 12]}>
              <Col xs={24} lg={8}>
                <Card variant={false} title="Modal: Gastos com Fretes" extra={<PieChartOutlined />}>
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {dashboardData.modais.length === 0 ? (
                      <Empty description="Sem dados" />
                    ) : (
                      dashboardData.modais.map((item, idx) => {
                        const colors = ['#1d4ed8', '#60a5fa', '#7c3aed', '#0ea5e9', '#475569'];
                        const color = colors[idx % colors.length];
                        return (
                          <div key={item.modal} className="mini-bar-row">
                            <div className="mini-bar-label">{item.modal}</div>
                            <div className="mini-bar-track">
                              <div
                                className="mini-bar-fill"
                                style={{ width: `${Math.min(item.percentual, 100)}%`, background: color }}
                              />
                            </div>
                            <div className="mini-bar-value">{formatPercent(item.percentual)}</div>
                          </div>
                        );
                      })
                    )}
                  </Space>
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card variant={false} title="Status da Entrega: Quantidade de Fretes" extra={<CheckCircleOutlined />}>
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {dashboardData.statuses.length === 0 ? (
                      <Empty description="Sem dados" />
                    ) : (
                      dashboardData.statuses.map((item, idx) => {
                        const max = dashboardData.statuses[0]?.quantidade || 1;
                        const percent = (item.quantidade / max) * 100;
                          const palette: Record<string, string> = {
                            'No Prazo': '#16a34a',
                            'Fora do Prazo': '#ef4444',
                            Entregue: '#22c55e',
                            'Em andamento': '#f59e0b',
                            'Em rota': '#3b82f6',
                            Pendente: '#64748b',
                            Cancelada: '#dc2626',
                            Devolvida: '#a16207',
                          };
                        const color = palette[item.status] || ['#16a34a', '#ef4444', '#64748b'][idx % 3];

                        return (
                          <div key={item.status} className="mini-bar-row">
                            <div className="mini-bar-label">{item.status}</div>
                            <div className="mini-bar-track">
                              <div
                                className="mini-bar-fill"
                                style={{ width: `${Math.min(percent, 100)}%`, background: color }}
                              />
                            </div>
                            <div className="mini-bar-value">
                              {item.quantidade.toLocaleString('pt-BR')}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </Space>
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card variant={false} title="Valor Transportado (R$) por tipo de Operação" extra={<BarChartOutlined />}>
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {dashboardData.operations.length === 0 ? (
                      <Empty description="Sem dados" />
                    ) : (
                      dashboardData.operations.map((item, idx) => {
                        const max = dashboardData.operations[0]?.valor || 1;
                        const percent = (item.valor / max) * 100;
                        const colors = ['#6b7280', '#0f172a', '#60a5fa', '#1d4ed8', '#c026d3', '#9333ea'];
                        const color = colors[idx % colors.length];

                        return (
                          <div key={item.operacao} className="mini-bar-row">
                            <div className="mini-bar-label">{item.operacao}</div>
                            <div className="mini-bar-track">
                              <div
                                className="mini-bar-fill"
                                style={{ width: `${Math.min(percent, 100)}%`, background: color }}
                              />
                            </div>
                            <div className="mini-bar-value">{formatCompactMoney(item.valor)}</div>
                          </div>
                        );
                      })
                    )}
                  </Space>
                </Card>
              </Col>
            </Row>
          </Space>
        </Modal>
      </Space>
    </div>
  );
}