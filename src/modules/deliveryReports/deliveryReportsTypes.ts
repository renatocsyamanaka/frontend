import type { Dayjs } from 'dayjs';

export type UserLite = {
  id: number;
  name: string;
  email?: string | null;
};

export type DeliveryReportHistory = {
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

export type DeliveryReport = {
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

export type DeliveryReportListResponse = {
  total: number;
  page: number;
  limit: number;
  pages: number;
  rows: DeliveryReport[];
};

export type FiltersState = {
  search?: string;
  cte?: string;
  notaFiscal?: string;
  transportadora?: string;
  statusEntrega?: string;
  operacao?: string;
  deletedFilter?: 'active' | 'all' | 'only';
  cancelledMode?: 'all' | 'hide' | 'only';
  startDate?: string;
  endDate?: string;
};

export type QuickViewFilter = 'all' | 'cancelled' | 'delivered' | 'delayed' | 'deleted';

export type FormValues = {
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

export type ExportFormValues = {
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

export type ImportStage = 'idle' | 'uploading' | 'queued' | 'processing' | 'done' | 'error';
export type YearFilterValue = 'all' | string;

export type ImportStartResponse = {
  message?: string;
  jobId: string;
  status?: string;
};

export type ImportStatusResponse = {
  jobId: string;
  fileName?: string;
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
};

export type ImportLogItem = {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  text: string;
  at: string;
};