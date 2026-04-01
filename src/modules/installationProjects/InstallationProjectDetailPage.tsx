import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Space,
  Tag,
  Typography,
  message,
  Select,
  Spin,
  Grid,
  Progress,
  Alert,
  Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  WhatsAppOutlined,
  PlayCircleOutlined,
  StopOutlined,
  PlusOutlined,
  SendOutlined,
  UnorderedListOutlined,
  CalendarOutlined,
  UploadOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';
import { api } from '../../lib/api';

type Status = 'A_INICIAR' | 'INICIADO' | 'FINALIZADO';

type Client = { id: number; name: string };

type RoleLite = { id: number; name: string; level: number };

type UserLite = {
  id: number;
  name: string;
  role?: RoleLite;
  roleId?: number;
  roleLevel?: number;
};

type UserOption = { id: number; name: string };

type ClientRow = {
  id: number;
  name: string;
  cidade?: string | null;
  estado?: string | null;
  documento?: string | null;
  telefone1?: string | null;
};

type ProjectItem = {
  id: number;
  equipmentName: string;
  equipmentCode?: string | null;
  qty: number;
  createdAt?: string;
};

type ProgressVehicle = {
  id?: number;
  plate: string;
  serial: string;
};

type ProjectProgress = {
  id: number;
  date: string;
  trucksDoneToday: number;
  notes?: string | null;
  author?: UserLite;
  createdAt?: string;
  vehicles?: ProgressVehicle[];
};

type ClientFull = {
  id: number;
  idCliente: string;
  name: string;
  nomeFantasia: string;
  documento: string;
  tipoCliente: string;
  segmentacao: string;
  estado: string;
  cidade: string;
  bairro: string;
  logradouro: string;
  complemento: string;
  cep: string;
  latitude: string;
  longitude: string;
  email1: string;
  telefone1: string;
  email2: string;
  telefone2: string;
};

type InstallationProject = {
  id: number;
  title: string;
  status: Status;
  af?: string | null;
  clientId: number | null;
  client?: Client | null;
  supervisorId?: number | null;
  coordinatorId?: number | null;
  supervisor?: UserLite | null;
  coordinator?: UserLite | null;

  technicianId?: number | null;
  technicianIds?: number[];
  technician?: UserLite | null;
  techniciansList?: UserOption[];
  technicianNames?: string[];

  contactName?: string | null;
  contactEmail?: string | null;
  contactEmails?: string[];

  contactPhone?: string | null;
  notes?: string | null;
  startPlannedAt?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  endPlannedAt?: string | null;
  trucksTotal: number;
  trucksDone: number;
  equipmentsTotal: number;
  equipmentsPerDay?: number | null;
  daysEstimated?: number | null;
  whatsappGroupName?: string | null;
  whatsappGroupLink?: string | null;
  items?: ProjectItem[];
  progress?: ProjectProgress[];
};

type ImportSummary = {
  loading: boolean;
  percent: number;
  totalRows: number;
  validRows: number;
  importedCount: number;
  duplicatesInFile: string[];
  alreadyPublished: string[];
  invalidRows: number;
};

function unwrap<T>(resData: any): T {
  return resData && typeof resData === 'object' && 'data' in resData ? (resData.data as T) : (resData as T);
}

function statusTag(s: Status) {
  if (s === 'A_INICIAR') return <Tag>À iniciar</Tag>;
  if (s === 'INICIADO') return <Tag color="blue">Iniciado</Tag>;
  return <Tag color="green">Finalizado</Tag>;
}

const ROLE_ID_TECNICO = 1;
const ROLE_ID_SUPERVISOR = 3;
const ROLE_ID_PSO = 8;
const MAX_VEHICLES_PREVIEW = 10;

function getRoleId(u?: UserLite | null) {
  return u?.role?.id ?? u?.roleId;
}
function getRoleName(u?: UserLite | null) {
  return u?.role?.name;
}
function getRoleLevel(u?: UserLite | null) {
  return u?.role?.level ?? u?.roleLevel;
}

function isSupervisor(u: UserLite) {
  const id = getRoleId(u);
  const name = getRoleName(u);
  const level = getRoleLevel(u);
  return id === ROLE_ID_SUPERVISOR || name === 'Supervisor' || level === 3;
}

function isTechnicianOrPSO(u: UserLite) {
  const id = getRoleId(u);
  const name = getRoleName(u);
  return id === ROLE_ID_TECNICO || id === ROLE_ID_PSO || name === 'Tecnico' || name === 'PSO';
}

function safeUrl(value?: string | null) {
  const v = String(value || '').trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.toString();
  } catch {
    return null;
  }
}

function isWhatsAppGroupLink(value?: string | null) {
  const url = safeUrl(value);
  if (!url) return false;
  return url.includes('chat.whatsapp.com/');
}

function normalizeHeader(value: string) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeEmailList(input: unknown): string[] {
  let arr: unknown[] = [];

  if (!input) return [];

  if (Array.isArray(input)) {
    arr = input;
  } else if (typeof input === 'string') {
    arr = input.split(/[;,]/);
  } else {
    arr = [input];
  }

  return [
    ...new Set(
      arr
        .map((item) => String(item || '').trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function isValidEmail(email?: string | null) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function parseDateOnly(value?: string | null) {
  if (!value) return null;
  return dayjs(String(value).slice(0, 10), 'YYYY-MM-DD');
}

function normalizePlate(raw: string) {
  const v = String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (v.length >= 7 && /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(v.slice(0, 7))) {
    return `${v.slice(0, 3)}-${v.slice(3, 7)}`;
  }
  if (v.length >= 7 && /^[A-Z]{3}[0-9]{4}$/.test(v.slice(0, 7))) {
    return `${v.slice(0, 3)}-${v.slice(3, 7)}`;
  }
  if (v.length > 3) return `${v.slice(0, 3)}-${v.slice(3, 7)}`;
  return v.slice(0, 3);
}

function isValidPlate(value?: string) {
  const v = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return /^[A-Z]{3}[0-9]{4}$/.test(v) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(v);
}

export default function InstallationProjectDetailPage() {
  const { id } = useParams();
  const projectId = Number(id);
  const nav = useNavigate();
  const qc = useQueryClient();
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const [editingItem, setEditingItem] = useState<ProjectItem | null>(null);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [clientViewOpen, setClientViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressListOpen, setProgressListOpen] = useState(false);
  const [editingProgress, setEditingProgress] = useState<ProjectProgress | null>(null);

  const [techSearch, setTechSearch] = useState('');
  const [supervisorSearch, setSupervisorSearch] = useState('');

  const [editForm] = Form.useForm();
  const [waForm] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [progressForm] = Form.useForm();

  const handleExportProgressDayExcel = (progress: ProjectProgress) => {
    const vehicles = progress?.vehicles || [];

    if (!vehicles.length) {
      message.warning('Esse dia não possui veículos para exportar.');
      return;
    }

    const data = vehicles.map((v) => ({
      PLACA: v.plate || '',
      SERIE: v.serial || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Progresso');

    const dateLabel = dayjs(progress.date).format('DD-MM-YYYY');
    XLSX.writeFile(workbook, `placas-series-${dateLabel}.xlsx`);
  };

  const [importSummary, setImportSummary] = useState<ImportSummary>({
    loading: false,
    percent: 0,
    totalRows: 0,
    validRows: 0,
    importedCount: 0,
    duplicatesInFile: [],
    alreadyPublished: [],
    invalidRows: 0,
  });

  const watchedVehicles = Form.useWatch('vehicles', progressForm) as any[] | undefined;

  const usersQuery = useQuery<UserLite[]>({
    queryKey: ['users', { techSearch, supervisorSearch }],
    queryFn: async () => {
      const q = (techSearch || supervisorSearch || '').trim();
      const params = q ? { q } : {};
      const res = await api.get('/users', { params });
      return unwrap<UserLite[]>(res.data);
    },
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const allUsers = usersQuery.data || [];

  const technicianOptions = useMemo(() => {
    return allUsers
      .filter(isTechnicianOrPSO)
      .map((u) => ({ id: u.id, name: u.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers]);

  const supervisorOptions = useMemo(() => {
    return allUsers
      .filter(isSupervisor)
      .map((u) => ({ id: u.id, name: u.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers]);

  const projectQuery = useQuery<InstallationProject>({
    queryKey: ['installation-project', projectId],
    enabled: Number.isFinite(projectId) && projectId > 0,
    queryFn: async () => {
      const res = await api.get(`/installation-projects/${projectId}`);
      return unwrap<InstallationProject>(res.data);
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });

  const p = projectQuery.data;
  const currentClientId = projectQuery.data?.clientId ?? null;

  const existingPublishedPlates = useMemo(() => {
    const set = new Set<string>();
    (p?.progress || []).forEach((prog) => {
      (prog.vehicles || []).forEach((v) => {
        const normalized = normalizePlate(v.plate || '');
        if (normalized) set.add(normalized);
      });
    });
    return set;
  }, [p?.progress]);

  const clientsQuery = useQuery<ClientRow[]>({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/clients')).data,
    staleTime: 60_000,
    retry: false,
  });

  const coordinatorsQuery = useQuery<UserOption[]>({
    queryKey: ['users', 'coordinators'],
    queryFn: async () => (await api.get('/users', { params: { minLevel: 4 } })).data,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const clientDetailQuery = useQuery<ClientFull>({
    queryKey: ['client-detail', currentClientId],
    enabled: !!currentClientId && clientViewOpen,
    queryFn: async () => {
      const res = await api.get(`/clients/${currentClientId}`);
      return unwrap<ClientFull>(res.data);
    },
    retry: false,
  });

  const supervisorNameById = (id?: number | null) => {
    if (!id) return null;
    const u = supervisorOptions.find((x) => x.id === id);
    return u?.name || `#${id}`;
  };

  const coordinatorNameById = (id?: number | null) => {
    if (!id) return null;
    const u = (coordinatorsQuery.data || []).find((x) => x.id === id);
    return u?.name || `#${id}`;
  };

  const coordinatorFromSupervisor = useMutation({
    mutationFn: async (supervisorId: number) => {
      const res = await api.get(`/users/${supervisorId}/coordinator`);
      return unwrap<{ coordinatorId: number | null; coordinatorName?: string | null }>(res.data);
    },
  });

  const sendDailyEmail = useMutation({
    mutationFn: async (payload?: { date?: string }) =>
      (await api.post(`/installation-projects/${projectId}/emails/daily`, payload || {})).data,
    onSuccess: () => message.success('Reporte diário enviado!'),
    onError: (e: any) => {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        e?.message ||
        'Falha ao enviar reporte diário';
      message.error(msg);
    },
  });

  const handleSendDaily = () => {
    sendDailyEmail.mutate({ date: dayjs().format('YYYY-MM-DD') });
  };

  const updateProject = useMutation({
    mutationFn: async (payload: Partial<InstallationProject>) => {
      const res = await api.patch(`/installation-projects/${projectId}`, payload);
      return unwrap<InstallationProject>(res.data);
    },
    onSuccess: async () => {
      message.success('Projeto atualizado!');
      setEditOpen(false);
      await qc.invalidateQueries({ queryKey: ['installation-project', projectId] });
      await qc.invalidateQueries({ queryKey: ['installation-projects'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao atualizar'),
  });

  const updateWhatsApp = useMutation({
    mutationFn: async (payload: { whatsappGroupName?: string | null; whatsappGroupLink?: string | null }) => {
      const res = await api.patch(`/installation-projects/${projectId}/whatsapp`, payload);
      return unwrap<InstallationProject>(res.data);
    },
    onSuccess: async () => {
      message.success('WhatsApp atualizado!');
      setWaOpen(false);
      await qc.invalidateQueries({ queryKey: ['installation-project', projectId] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao atualizar WhatsApp'),
  });

  const startProject = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/installation-projects/${projectId}/start`);
      return unwrap<InstallationProject>(res.data);
    },
    onSuccess: async () => {
      message.success('Projeto iniciado! O cliente foi notificado automaticamente.');
      await qc.invalidateQueries({ queryKey: ['installation-project', projectId] });
      await qc.invalidateQueries({ queryKey: ['installation-projects'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao iniciar'),
  });

  const finishProject = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/installation-projects/${projectId}/finish`);
      return unwrap<InstallationProject>(res.data);
    },
    onSuccess: async () => {
      message.success('Projeto finalizado! O compilado final foi enviado automaticamente.');
      await qc.invalidateQueries({ queryKey: ['installation-project', projectId] });
      await qc.invalidateQueries({ queryKey: ['installation-projects'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao finalizar'),
  });

  const addItem = useMutation({
    mutationFn: async (payload: { equipmentName: string; equipmentCode?: string | null; qty: number }) => {
      const res = await api.post(`/installation-projects/${projectId}/items`, payload);
      return unwrap<ProjectItem>(res.data);
    },
    onSuccess: async () => {
      message.success('Item adicionado!');
      setItemOpen(false);
      itemForm.resetFields();
      await qc.invalidateQueries({ queryKey: ['installation-project', projectId] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao adicionar item'),
  });
  const deleteItem = useMutation({
    mutationFn: async (itemId: number) => {
      const res = await api.delete(`/installation-projects/${projectId}/items/${itemId}`);
      return res.data;
    },
    onSuccess: async () => {
      message.success('Item excluído!');
      await qc.invalidateQueries({ queryKey: ['installation-project', projectId] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao excluir item'),
  });
  const updateItem = useMutation({
    mutationFn: async ({
      itemId,
      payload,
    }: {
      itemId: number;
      payload: { equipmentName: string; equipmentCode?: string | null; qty: number };
    }) => {
      const res = await api.put(`/installation-projects/${projectId}/items/${itemId}`, payload);
      return unwrap<ProjectItem>(res.data);
    },
    onSuccess: async () => {
      message.success('Item atualizado!');
      setItemOpen(false);
      setEditingItem(null);
      itemForm.resetFields();
      await qc.invalidateQueries({ queryKey: ['installation-project', projectId] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao atualizar item'),
  });
  async function extractVehiclesFromExcelRows(rows: any[]) {
    if (!Array.isArray(rows) || !rows.length) {
      return {
        vehicles: [] as { plate: string; serial: string }[],
        duplicatesInFile: [] as string[],
        alreadyPublished: [] as string[],
        invalidRows: 0,
      };
    }

    const unique = new Map<string, { plate: string; serial: string }>();
    const duplicatePlatesInFile = new Set<string>();
    const alreadyPublishedSet = new Set<string>();
    let invalidRows = 0;

    const total = rows.length;

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const normalizedRow: Record<string, any> = {};

      Object.keys(row || {}).forEach((key) => {
        normalizedRow[normalizeHeader(key)] = row[key];
      });

      const plateRaw = normalizedRow['PLACA'] ?? normalizedRow['PLATE'];
      const serialRaw =
        normalizedRow['SERIE/ SERIAL'] ??
        normalizedRow['SERIE/SERIAL'] ??
        normalizedRow['SERIE'] ??
        normalizedRow['SERIAL'] ??
        normalizedRow['N SERIE'];

      const plate = normalizePlate(String(plateRaw || ''));
      const serial = String(serialRaw || '').trim();

      if (!plate || !serial || !isValidPlate(plate)) {
        invalidRows += 1;
      } else {
        const key = `${plate}__${serial}`;

        if (existingPublishedPlates.has(plate) && (!editingProgress || !(editingProgress.vehicles || []).some((v) => normalizePlate(v.plate) === plate))) {
          alreadyPublishedSet.add(plate);
        }

        if (unique.has(key)) {
          duplicatePlatesInFile.add(plate);
        } else {
          unique.set(key, { plate, serial });
        }
      }

      const percent = Math.min(100, Math.round(((i + 1) / total) * 100));
      setImportSummary((prev) => ({
        ...prev,
        loading: true,
        percent,
        totalRows: total,
      }));

      if (i % 50 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return {
      vehicles: Array.from(unique.values()),
      duplicatesInFile: Array.from(duplicatePlatesInFile),
      alreadyPublished: Array.from(alreadyPublishedSet),
      invalidRows,
    };
  }

  const importVehiclesFromExcel = async (file: File) => {
    try {
      setImportSummary({
        loading: true,
        percent: 5,
        totalRows: 0,
        validRows: 0,
        importedCount: 0,
        duplicatesInFile: [],
        alreadyPublished: [],
        invalidRows: 0,
      });

      const buffer = await file.arrayBuffer();
      setImportSummary((prev) => ({ ...prev, percent: 20 }));

      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setImportSummary((prev) => ({ ...prev, loading: false, percent: 0 }));
        message.error('Arquivo Excel sem abas.');
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      setImportSummary((prev) => ({
        ...prev,
        percent: 35,
        totalRows: Array.isArray(rows) ? rows.length : 0,
      }));

      const { vehicles, duplicatesInFile, alreadyPublished, invalidRows } =
        await extractVehiclesFromExcelRows(rows);

      if (!vehicles.length) {
        setImportSummary({
          loading: false,
          percent: 100,
          totalRows: Array.isArray(rows) ? rows.length : 0,
          validRows: 0,
          importedCount: 0,
          duplicatesInFile,
          alreadyPublished,
          invalidRows,
        });

        message.warning(
          'Nenhum veículo válido encontrado. Verifique se o Excel possui as colunas "PLACA" e "SERIE/ SERIAL".',
        );
        return;
      }

      progressForm.setFieldsValue({ vehicles });

      setImportSummary({
        loading: false,
        percent: 100,
        totalRows: Array.isArray(rows) ? rows.length : 0,
        validRows: vehicles.length,
        importedCount: vehicles.length,
        duplicatesInFile,
        alreadyPublished,
        invalidRows,
      });

      if (alreadyPublished.length > 0) {
        message.warning(
          `Importação concluída. ${vehicles.length} veículo(s) carregado(s), mas ${alreadyPublished.length} placa(s) já estavam lançadas anteriormente.`,
        );
      } else {
        message.success(`${vehicles.length} veículo(s) importado(s) do Excel.`);
      }
    } catch (error) {
      console.error(error);
      setImportSummary((prev) => ({ ...prev, loading: false, percent: 0 }));
      message.error('Falha ao ler o arquivo Excel.');
    }
  };

  const addProgress = useMutation({
    mutationFn: async (payload: { date: string; notes?: string | null; vehicles: { plate: string; serial: string }[] }) => {
      const res = await api.post(`/installation-projects/${projectId}/progress`, payload);
      return unwrap<ProjectProgress>(res.data);
    },
    onSuccess: async () => {
      message.success('Progresso lançado!');
      setProgressOpen(false);
      setEditingProgress(null);
      progressForm.resetFields();
      setImportSummary({
        loading: false,
        percent: 0,
        totalRows: 0,
        validRows: 0,
        importedCount: 0,
        duplicatesInFile: [],
        alreadyPublished: [],
        invalidRows: 0,
      });
      await qc.invalidateQueries({ queryKey: ['installation-project', projectId] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao lançar progresso'),
  });

  const updateProgress = useMutation({
    mutationFn: async ({
      progressId,
      payload,
    }: {
      progressId: number;
      payload: { date: string; notes?: string | null; vehicles: { plate: string; serial: string }[] };
    }) => {
      const res = await api.put(`/installation-projects/${projectId}/progress/${progressId}`, payload);
      return unwrap<ProjectProgress>(res.data);
    },
    onSuccess: async () => {
      message.success('Progresso atualizado!');
      setProgressOpen(false);
      setEditingProgress(null);
      progressForm.resetFields();
      setImportSummary({
        loading: false,
        percent: 0,
        totalRows: 0,
        validRows: 0,
        importedCount: 0,
        duplicatesInFile: [],
        alreadyPublished: [],
        invalidRows: 0,
      });
      await qc.invalidateQueries({ queryKey: ['installation-project', projectId] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao atualizar progresso'),
  });

  const deleteProgress = useMutation({
    mutationFn: async (progressId: number) => {
      const res = await api.delete(`/installation-projects/${projectId}/progress/${progressId}`);
      return res.data;
    },
    onSuccess: async () => {
      message.success('Progresso excluído!');
      await qc.invalidateQueries({ queryKey: ['installation-project', projectId] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao excluir progresso'),
  });

  const itemsSorted = useMemo(() => {
    const src = p?.items || [];
    return [...src].sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [p?.items]);

  const progressSorted = useMemo(() => {
    const src = p?.progress || [];
    return [...src].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
  }, [p?.progress]);

  const technicianNames = useMemo(() => {
    if (p?.technicianNames?.length) return p.technicianNames;
    if (p?.techniciansList?.length) return p.techniciansList.map((t) => t.name);
    if (p?.technician?.name) return [p.technician.name];
    return [];
  }, [p]);

  const projectEmails = useMemo(() => {
    const list = normalizeEmailList(p?.contactEmails?.length ? p.contactEmails : p?.contactEmail);
    return list;
  }, [p]);

  const hasProjectEmails = projectEmails.length > 0;

  const supervisorLabel = p?.supervisor?.name || supervisorNameById(p?.supervisorId) || '-';
  const coordinatorLabel = p?.coordinator?.name || coordinatorNameById(p?.coordinatorId) || '-';
  const technicianLabel = technicianNames.length ? technicianNames.join(', ') : '-';
  const contactEmailsLabel = projectEmails.length ? projectEmails.join(', ') : '-';

  const wrapAny = { overflowWrap: 'anywhere' as const, wordBreak: 'break-word' as const };

  const progressPercent = useMemo(() => {
    if (!p?.trucksTotal || p.trucksTotal <= 0) return 0;
    return Math.min(100, Math.round((p.trucksDone / p.trucksTotal) * 100));
  }, [p?.trucksDone, p?.trucksTotal]);

  const pageWrap: React.CSSProperties = {
    display: 'grid',
    gap: isMobile ? 12 : 16,
    maxWidth: '100%',
    overflowX: 'hidden',
  };

  const actionsWrap: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    width: '100%',
  };

  const twoCols: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
    gap: isMobile ? 12 : 16,
    alignItems: 'start',
    maxWidth: '100%',
  };

  const handleConfirmStart = () => {
    Modal.confirm({
      title: 'Confirmar início do projeto?',
      icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
      centered: true,
      okText: 'Sim, iniciar',
      cancelText: 'Cancelar',
      okButtonProps: { type: 'primary' },
      content: (
        <div style={{ display: 'grid', gap: 8 }}>
          <Typography.Text>
            Ao iniciar, o projeto mudará de status e o cliente receberá automaticamente as informações de início.
          </Typography.Text>
          <Typography.Text strong type="danger">
            Essa ação não poderá ser desfeita.
          </Typography.Text>
        </div>
      ),
      onOk: async () => {
        await startProject.mutateAsync();
      },
    });
  };

  const handleConfirmFinish = () => {
    Modal.confirm({
      title: 'Confirmar finalização do projeto?',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      centered: true,
      okText: 'Sim, finalizar',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      content: (
        <div style={{ display: 'grid', gap: 8 }}>
          <Typography.Text>
            Ao finalizar, o projeto será encerrado e o compilado final será enviado automaticamente ao cliente.
          </Typography.Text>
          <Typography.Text strong type="danger">
            Essa ação não poderá ser desfeita.
          </Typography.Text>
        </div>
      ),
      onOk: async () => {
        await finishProject.mutateAsync();
      },
    });
  };

  const handleEditProgress = (progress: ProjectProgress) => {
    setEditingProgress(progress);
    progressForm.setFieldsValue({
      date: dayjs(progress.date),
      notes: progress.notes || null,
      vehicles:
        progress.vehicles?.length
          ? progress.vehicles.map((v) => ({
              plate: v.plate || '',
              serial: v.serial || '',
            }))
          : [{ plate: '', serial: '' }],
    });
    setProgressOpen(true);
  };

  const InfoRow = ({
    label,
    value,
    action,
  }: {
    label: string;
    value?: React.ReactNode;
    action?: React.ReactNode;
  }) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        padding: '8px 0',
        borderBottom: '1px solid #f0f0f0',
        flexWrap: 'wrap',
      }}
    >
      <Typography.Text type="secondary">{label}</Typography.Text>
      <div
        style={{
          textAlign: 'right',
          minWidth: 0,
          flex: 1,
          ...wrapAny,
        }}
      >
        <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
          <span>{value ?? '-'}</span>
          {action}
        </Space>
      </div>
    </div>
  );

  const StatCard = ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <Card
      size="small"
      styles={{ body: { padding: 14 } }}
      style={{
        borderRadius: 14,
      }}
    >
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {label}
      </Typography.Text>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </Card>
  );

  const SummaryContent = () => (
    <Card
      title={
        <Space size={8}>
          <UnorderedListOutlined />
          <span>Resumo do projeto</span>
        </Space>
      }
      styles={{
        body: { padding: isMobile ? 14 : 20 },
      }}
      style={{ borderRadius: 16 }}
    >
      <div
        style={{
          display: 'grid',
          gap: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <Typography.Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
              {p?.title}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ ...wrapAny }}>
              {p?.client?.name || (p?.clientId ? `Cliente #${p.clientId}` : 'Sem cliente vinculado')}
            </Typography.Text>
          </div>

          <div>{p ? statusTag(p.status) : null}</div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))',
            gap: 12,
          }}
        >
          <StatCard label="Caminhões" value={`${p?.trucksDone ?? 0}/${p?.trucksTotal ?? 0}`} />
          <StatCard label="Equipamentos" value={p?.equipmentsTotal ?? 0} />
          <StatCard label="Equip./dia" value={p?.equipmentsPerDay ?? '-'} />
          <StatCard label="Dias estimados" value={p?.daysEstimated ?? '-'} />
        </div>

        <Card
          size="small"
          styles={{ body: { padding: 14 } }}
          style={{ borderRadius: 14, background: '#fafafa' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <Typography.Text strong>Andamento geral</Typography.Text>
            <Typography.Text type="secondary">{progressPercent}%</Typography.Text>
          </div>

          <Progress percent={progressPercent} />
        </Card>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 16,
          }}
        >
          <Card
            size="small"
            title="Responsáveis"
            styles={{ body: { padding: 14 } }}
            style={{ borderRadius: 14 }}
          >
            <InfoRow label="Técnico / Prestador" value={technicianLabel} />
            <InfoRow label="Supervisor" value={supervisorLabel} />
            <InfoRow label="Coordenador" value={coordinatorLabel} />
            <div style={{ paddingTop: 8 }}>
              <InfoRow label="AF" value={p?.af || '-'} />
            </div>
          </Card>

          <Card
            size="small"
            title="Datas"
            styles={{ body: { padding: 14 } }}
            style={{ borderRadius: 14 }}
          >
            <InfoRow
              label="Prev. início"
              value={parseDateOnly(p?.startPlannedAt)?.format('DD/MM/YYYY') || '-'}
            />
            <InfoRow
              label="Prev. fim"
              value={parseDateOnly(p?.endPlannedAt)?.format('DD/MM/YYYY') || '-'}
            />
            <InfoRow
              label="Início"
              value={p?.startAt ? dayjs(p.startAt).format('DD/MM/YYYY HH:mm') : '-'}
            />
            <div style={{ paddingTop: 8 }}>
              <InfoRow
                label="Fim"
                value={p?.endAt ? dayjs(p.endAt).format('DD/MM/YYYY HH:mm') : '-'}
              />
            </div>
          </Card>

          <Card
            size="small"
            title="Cliente"
            styles={{ body: { padding: 14 } }}
            style={{ borderRadius: 14 }}
          >
            <InfoRow
              label="Nome"
              value={p?.client?.name || (p?.clientId ? `#${p.clientId}` : '-')}
              action={
                <Button size="small" onClick={() => setClientViewOpen(true)} disabled={!p?.clientId}>
                  Abrir cliente
                </Button>
              }
            />
          </Card>

          <Card
            size="small"
            title="Contato"
            styles={{ body: { padding: 14 } }}
            style={{ borderRadius: 14 }}
          >
            <InfoRow label="Contato" value={p?.contactName || '-'} />
            <InfoRow label="E-mails" value={contactEmailsLabel} />
            <InfoRow label="Telefone" value={p?.contactPhone || '-'} />
          </Card>
        </div>

        <Card
          size="small"
          title="Observações"
          styles={{ body: { padding: 14 } }}
          style={{ borderRadius: 14 }}
        >
          <Typography.Text style={{ whiteSpace: 'pre-wrap', ...wrapAny }}>
            {p?.notes || '-'}
          </Typography.Text>
        </Card>
      </div>
    </Card>
  );

  if (projectQuery.isLoading) {
    return <Typography.Text>Carregando projeto...</Typography.Text>;
  }

  if (projectQuery.isError || !p) {
    return (
      <Card>
        <Typography.Text type="danger">Falha ao carregar projeto.</Typography.Text>
        <Divider />
        <Button onClick={() => nav('/projetos-instalacao')}>Voltar</Button>
      </Card>
    );
  }

  return (
    <div style={pageWrap}>
      <div style={actionsWrap}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => nav('/projetos-instalacao')} block={isMobile}>
          Voltar para projetos
        </Button>

        <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)} block={isMobile}>
          Editar
        </Button>

        <Button
          icon={<WhatsAppOutlined />}
          onClick={() => setWaOpen(true)}
          style={{ backgroundColor: '#25D366', borderColor: '#25D366', color: '#fff' }}
          block={isMobile}
        >
          WhatsApp
        </Button>

        <Button
          icon={<SendOutlined />}
          loading={sendDailyEmail.isPending}
          onClick={handleSendDaily}
          block={isMobile}
          disabled={p.status === 'A_INICIAR' || !hasProjectEmails}
        >
          Enviar reporte diário (hoje)
        </Button>

        <Button
          icon={<PlayCircleOutlined />}
          type="primary"
          disabled={p.status !== 'A_INICIAR'}
          loading={startProject.isPending}
          onClick={handleConfirmStart}
          block={isMobile}
        >
          Iniciar
        </Button>

        <Button
          icon={<StopOutlined />}
          danger
          disabled={p.status !== 'INICIADO'}
          loading={finishProject.isPending}
          onClick={handleConfirmFinish}
          block={isMobile}
        >
          Finalizar
        </Button>
      </div>

      <div style={twoCols}>
        <div style={{ minWidth: 0 }}>
          <SummaryContent />
        </div>

        <div style={{ display: 'grid', gap: isMobile ? 12 : 16, minWidth: 0 }}>
          <Card
            title="Itens / Equipamentos"
            extra={
              <Button icon={<PlusOutlined />} type="primary" onClick={() => setItemOpen(true)}>
                Adicionar item
              </Button>
            }
            styles={{ body: { padding: isMobile ? 12 : 24 } }}
            style={{ borderRadius: 16 }}
          >
            <List
              dataSource={itemsSorted}
              locale={{ emptyText: 'Nenhum item cadastrado.' }}
              renderItem={(it) => (
                <List.Item>
                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Typography.Text strong style={wrapAny as any}>
                        {it.equipmentName}
                      </Typography.Text>

                      {it.equipmentCode ? (
                        <div style={{ marginTop: 2 }}>
                          <Typography.Text type="secondary" style={wrapAny as any}>
                            {it.equipmentCode}
                          </Typography.Text>
                        </div>
                      ) : null}
                    </div>

                    <Space wrap>
                      <Tag>{`Qtd: ${it.qty}`}</Tag>

                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setEditingItem(it);
                          itemForm.setFieldsValue({
                            equipmentName: it.equipmentName,
                            equipmentCode: it.equipmentCode || null,
                            qty: it.qty,
                          });
                          setItemOpen(true);
                        }}
                      >
                        Editar
                      </Button>

                      <Popconfirm
                        title="Excluir este item?"
                        description="Essa ação não poderá ser desfeita."
                        okText="Excluir"
                        cancelText="Cancelar"
                        onConfirm={() => deleteItem.mutate(it.id)}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          loading={deleteItem.isPending}
                        >
                          Excluir
                        </Button>
                      </Popconfirm>
                    </Space>
                  </div>
                </List.Item>
              )}
            />
          </Card>

          <Card
            title={
              <Space>
                <CalendarOutlined /> Diário
              </Space>
            }
            extra={
              <Space>
                <Button icon={<UnorderedListOutlined />} onClick={() => setProgressListOpen(true)}>
                  Ver mais
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  type="primary"
                  onClick={() => {
                    setEditingProgress(null);
                    setProgressOpen(true);
                  }}
                >
                  Lançar progresso
                </Button>
              </Space>
            }
            styles={{ body: { padding: isMobile ? 12 : 24 } }}
            style={{ borderRadius: 16 }}
          >
            <List
              dataSource={progressSorted}
              locale={{ emptyText: 'Nenhum progresso lançado.' }}
              renderItem={(pr) => (
                <List.Item>
                  <div style={{ width: '100%', display: 'grid', gap: 6, maxWidth: '100%' }}>
                    <Space wrap>
                      <Tag>{dayjs(pr.date).format('DD/MM/YYYY')}</Tag>
                      <Typography.Text strong>{`Caminhões no dia: ${pr.trucksDoneToday}`}</Typography.Text>
                      {pr.author?.name ? (
                        <Typography.Text type="secondary">por {pr.author.name}</Typography.Text>
                      ) : null}
                    </Space>

                    {pr.vehicles?.length ? (
                      <div style={{ marginTop: 4, display: 'grid', gap: 2, ...wrapAny }}>
                        {pr.vehicles.slice(0, MAX_VEHICLES_PREVIEW).map((v, idx) => (
                          <div key={`${v.plate}-${v.serial}-${idx}`} style={wrapAny as any}>
                            <b>PLACA:</b> {v.plate} <span style={{ marginLeft: 10 }} />
                            <b>SÉRIE:</b> {v.serial}
                          </div>
                        ))}

                        {pr.vehicles.length > MAX_VEHICLES_PREVIEW ? (
                          <Button
                            type="link"
                            style={{ padding: 0, height: 'auto', justifyContent: 'flex-start' }}
                            onClick={() => setProgressListOpen(true)}
                          >
                            + {pr.vehicles.length - MAX_VEHICLES_PREVIEW} placa(s). Clique em Ver mais
                          </Button>
                        ) : null}
                      </div>
                    ) : null}

                    {pr.notes ? (
                      <Typography.Text style={{ whiteSpace: 'pre-wrap', ...(wrapAny as any) }}>
                        {pr.notes}
                      </Typography.Text>
                    ) : null}
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </div>
      </div>

      <Modal
        title="Cliente - Visualizar"
        open={clientViewOpen}
        onCancel={() => setClientViewOpen(false)}
        footer={[
          <Button key="close" onClick={() => setClientViewOpen(false)}>
            Fechar
          </Button>,
        ]}
        width={isMobile ? '96vw' : 900}
        style={isMobile ? { maxWidth: '96vw' } : {}}
        centered
      >
        {!currentClientId ? (
          <Typography.Text type="secondary">Este projeto não tem cliente vinculado.</Typography.Text>
        ) : clientDetailQuery.isLoading ? (
          <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
            <Spin />
          </div>
        ) : clientDetailQuery.isError ? (
          <Typography.Text type="danger">Falha ao carregar o cliente.</Typography.Text>
        ) : (
          <Descriptions bordered size="small" column={isMobile ? 1 : 2}>
            <Descriptions.Item label="ID_cliente">{clientDetailQuery.data?.idCliente}</Descriptions.Item>
            <Descriptions.Item label="tipo_cliente">{clientDetailQuery.data?.tipoCliente}</Descriptions.Item>
            <Descriptions.Item label="cliente">{clientDetailQuery.data?.name}</Descriptions.Item>
            <Descriptions.Item label="nome_fantasia">{clientDetailQuery.data?.nomeFantasia}</Descriptions.Item>
            <Descriptions.Item label="cpf/cnpj">{clientDetailQuery.data?.documento}</Descriptions.Item>
            <Descriptions.Item label="segmentacao">{clientDetailQuery.data?.segmentacao}</Descriptions.Item>
            <Descriptions.Item label="estado">{clientDetailQuery.data?.estado}</Descriptions.Item>
            <Descriptions.Item label="cidade">{clientDetailQuery.data?.cidade}</Descriptions.Item>
            <Descriptions.Item label="bairro">{clientDetailQuery.data?.bairro}</Descriptions.Item>
            <Descriptions.Item label="cep">{clientDetailQuery.data?.cep}</Descriptions.Item>
            <Descriptions.Item label="logradouro" span={isMobile ? 1 : 2}>
              <span style={wrapAny as any}>{clientDetailQuery.data?.logradouro}</span>
            </Descriptions.Item>
            <Descriptions.Item label="complemento" span={isMobile ? 1 : 2}>
              <span style={wrapAny as any}>{clientDetailQuery.data?.complemento}</span>
            </Descriptions.Item>
            <Descriptions.Item label="latitude">{clientDetailQuery.data?.latitude}</Descriptions.Item>
            <Descriptions.Item label="longitude">{clientDetailQuery.data?.longitude}</Descriptions.Item>
            <Descriptions.Item label="email1">{clientDetailQuery.data?.email1}</Descriptions.Item>
            <Descriptions.Item label="telefone1">{clientDetailQuery.data?.telefone1}</Descriptions.Item>
            <Descriptions.Item label="email2">{clientDetailQuery.data?.email2}</Descriptions.Item>
            <Descriptions.Item label="telefone2">{clientDetailQuery.data?.telefone2}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        open={progressListOpen}
        title={
          <Space>
            <CalendarOutlined />
            Progresso diário (todos)
          </Space>
        }
        onCancel={() => setProgressListOpen(false)}
        footer={[
          <Button key="close" onClick={() => setProgressListOpen(false)}>
            Fechar
          </Button>,
        ]}
        width={isMobile ? '96vw' : 900}
        style={isMobile ? { maxWidth: '96vw' } : {}}
        centered
      >
        <List
          dataSource={progressSorted}
          locale={{ emptyText: 'Nenhum progresso lançado.' }}
          renderItem={(pr) => (
            <List.Item>
              <div style={{ width: '100%', display: 'grid', gap: 6, maxWidth: '100%' }}>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                  align="start"
                  wrap
                >
                  <Space wrap>
                    <Tag>{dayjs(pr.date).format('DD/MM/YYYY')}</Tag>
                    <Typography.Text strong>{`Caminhões no dia: ${pr.trucksDoneToday}`}</Typography.Text>
                    {pr.author?.name ? <Typography.Text type="secondary">por {pr.author.name}</Typography.Text> : null}
                  </Space>

                  <Space>
                    <Button size="small" onClick={() => handleExportProgressDayExcel(pr)}>
                      Excel
                    </Button>

                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEditProgress(pr)}>
                      Editar
                    </Button>

                    <Popconfirm
                      title="Excluir este progresso diário?"
                      description="Essa ação remove o lançamento e recalcula o total do projeto."
                      okText="Excluir"
                      cancelText="Cancelar"
                      onConfirm={() => deleteProgress.mutate(pr.id)}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />}>
                        Excluir
                      </Button>
                    </Popconfirm>
                  </Space>
                </Space>

                {pr.vehicles?.length ? (
                  <div style={{ marginTop: 4, display: 'grid', gap: 2, ...wrapAny }}>
                    {pr.vehicles.map((v, idx) => (
                      <div key={`${v.plate}-${v.serial}-${idx}`} style={wrapAny as any}>
                        <b>PLACA:</b> {v.plate} <span style={{ marginLeft: 10 }} />
                        <b>SÉRIE:</b> {v.serial}
                      </div>
                    ))}
                  </div>
                ) : null}

                {pr.notes ? (
                  <Typography.Text style={{ whiteSpace: 'pre-wrap', ...(wrapAny as any) }}>
                    {pr.notes}
                  </Typography.Text>
                ) : null}
              </div>
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        open={editOpen}
        title="Editar Projeto"
        okText="Salvar"
        confirmLoading={updateProject.isPending}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          try {
            const v = await editForm.validateFields();

            const contactEmails = normalizeEmailList(v.contactEmails);
            const technicianIds = Array.isArray(v.technicianIds)
              ? [...new Set(v.technicianIds.map((n: any) => Number(n)).filter(Boolean))]
              : [];

            updateProject.mutate({
              title: v.title,
              af: v.af ?? null,
              clientId: v.clientId ?? null,
              technicianIds,
              technicianId: technicianIds[0] ?? null,
              supervisorId: v.supervisorId ? Number(v.supervisorId) : null,
              trucksTotal: v.trucksTotal ?? 0,
              equipmentsPerDay: v.equipmentsPerDay ?? null,
              startPlannedAt: v.startPlannedAt ? (v.startPlannedAt as Dayjs).format('YYYY-MM-DD') : null,
              endPlannedAt: v.endPlannedAt ? (v.endPlannedAt as Dayjs).format('YYYY-MM-DD') : null,
              contactName: v.contactName ?? null,
              contactEmails,
              contactEmail: contactEmails[0] ?? null,
              contactPhone: v.contactPhone ?? null,
              notes: v.notes ?? null,
            });
          } catch {}
        }}
        afterOpenChange={(o) => {
          if (o) {
            setTechSearch('');
            setSupervisorSearch('');

            const initialEmails = normalizeEmailList(
              p.contactEmails?.length ? p.contactEmails : p.contactEmail,
            );

            const initialTechnicianIds =
              p.technicianIds?.length ? p.technicianIds : p.technicianId ? [p.technicianId] : [];

            editForm.setFieldsValue({
              title: p.title,
              af: p.af ?? null,
              clientId: p.clientId ?? null,
              technicianIds: initialTechnicianIds,
              supervisorId: p.supervisorId ?? null,
              coordinatorId: p.coordinatorId ?? null,
              trucksTotal: p.trucksTotal ?? 0,
              equipmentsPerDay: p.equipmentsPerDay ?? null,
              startPlannedAt: parseDateOnly(p.startPlannedAt),
              endPlannedAt: parseDateOnly(p.endPlannedAt),
              contactName: p.contactName ?? null,
              contactEmails: initialEmails,
              contactPhone: p.contactPhone ?? null,
              notes: p.notes ?? null,
            });
          }
        }}
        width={isMobile ? '96vw' : 820}
        style={isMobile ? { maxWidth: '96vw' } : {}}
        centered
      >
        <Form
          form={editForm}
          layout="vertical"
          onValuesChange={async (changed) => {
            if (changed?.supervisorId) {
              const supervisorId = Number(changed.supervisorId);
              if (!Number.isFinite(supervisorId) || supervisorId <= 0) return;

              try {
                const r = await coordinatorFromSupervisor.mutateAsync(supervisorId);
                editForm.setFieldValue('coordinatorId', r?.coordinatorId ?? null);
              } catch {}
            }
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 12,
            }}
          >
            <Form.Item
              name="technicianIds"
              label="Técnico / Prestador"
            >
              <Select
                mode="multiple"
                showSearch
                placeholder={usersQuery.isLoading ? 'Carregando...' : 'Selecione um ou mais'}
                loading={usersQuery.isLoading}
                filterOption={false}
                onSearch={(v) => setTechSearch(v)}
                onDropdownVisibleChange={(isOpen) => {
                  if (isOpen) setTechSearch('');
                }}
                options={technicianOptions.map((t) => ({ label: t.name, value: t.id }))}
                notFoundContent={usersQuery.isLoading ? <Spin size="small" /> : 'Nenhum técnico/prestador encontrado'}
              />
            </Form.Item>

            <Form.Item
              name="supervisorId"
              label="Supervisor (obrigatório)"
              rules={[{ required: true, message: 'Selecione o supervisor' }]}
            >
              <Select
                showSearch
                placeholder={usersQuery.isLoading ? 'Carregando...' : 'Selecione'}
                loading={usersQuery.isLoading}
                filterOption={false}
                onSearch={(v) => setSupervisorSearch(v)}
                onDropdownVisibleChange={(isOpen) => {
                  if (isOpen) setSupervisorSearch('');
                }}
                options={supervisorOptions.map((u) => ({ value: u.id, label: u.name }))}
                notFoundContent={usersQuery.isLoading ? <Spin size="small" /> : 'Nenhum supervisor encontrado'}
              />
            </Form.Item>

            <Form.Item
              name="coordinatorId"
              label="Coordenador (auto)"
              tooltip="Preenchido automaticamente pelo supervisor"
              style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}
            >
              <Select
                disabled
                loading={coordinatorsQuery.isLoading || coordinatorFromSupervisor.isPending}
                placeholder={coordinatorFromSupervisor.isPending ? 'Buscando...' : 'Automático'}
                options={(coordinatorsQuery.data || []).map((u) => ({ value: u.id, label: u.name }))}
              />
            </Form.Item>
          </div>

          <Form.Item name="title" label="Nome do Projeto" rules={[{ required: true, message: 'Informe o nome' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="af" label="AF" rules={[{ max: 50, message: 'Máximo 50 caracteres' }]}>
            <Input placeholder="Ex: AF-2026-000123" />
          </Form.Item>

          <Form.Item name="clientId" label="Cliente">
            <Select
              showSearch
              allowClear
              placeholder="Selecione um cliente"
              loading={clientsQuery.isLoading}
              optionFilterProp="label"
              filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
              options={(clientsQuery.data || []).map((c) => {
                const loc = [c.cidade, c.estado].filter(Boolean).join(' / ');
                const doc = c.documento ? ` • ${c.documento}` : '';
                const tel = c.telefone1 ? ` • ${c.telefone1}` : '';
                return {
                  value: c.id,
                  label: `${c.name}${loc ? ` — ${loc}` : ''}${doc}${tel}`,
                };
              })}
            />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <Form.Item name="trucksTotal" label="Qtd. veículos (total)" rules={[{ required: true, message: 'Informe' }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="equipmentsPerDay" label="Previsão de instalação por dia">
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <Form.Item name="startPlannedAt" label="Data prevista de início">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" inputReadOnly />
            </Form.Item>

            <Form.Item name="endPlannedAt" label="Data prevista de término">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" inputReadOnly />
            </Form.Item>
          </div>

          <Form.Item name="contactName" label="Contato">
            <Input />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <Form.Item
              name="contactEmails"
              label="E-mails"
              rules={[
                { required: true, message: 'Informe pelo menos um e-mail' },
                {
                  validator: async (_, value) => {
                    const emails = normalizeEmailList(value);
                    if (!emails.length) {
                      throw new Error('Informe pelo menos um e-mail');
                    }
                    const invalid = emails.find((email) => !isValidEmail(email));
                    if (invalid) {
                      throw new Error(`E-mail inválido: ${invalid}`);
                    }
                  },
                },
              ]}
            >
              <Select mode="tags" tokenSeparators={[',', ';', ' ']} placeholder="Digite um ou mais e-mails" />
            </Form.Item>

            <Form.Item name="contactPhone" label="Telefone (opcional)">
              <Input />
            </Form.Item>
          </div>

          <Form.Item name="notes" label="Observações (opcional)">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={waOpen}
        title="WhatsApp"
        okText="Salvar"
        confirmLoading={updateWhatsApp.isPending}
        onCancel={() => setWaOpen(false)}
        onOk={async () => {
          try {
            const v = await waForm.validateFields();
            updateWhatsApp.mutate({
              whatsappGroupName: v.whatsappGroupName ?? null,
              whatsappGroupLink: v.whatsappGroupLink ?? null,
            });
          } catch {}
        }}
        afterOpenChange={(o) => {
          if (o) {
            waForm.setFieldsValue({
              whatsappGroupName: p.whatsappGroupName ?? null,
              whatsappGroupLink: p.whatsappGroupLink ?? null,
            });
          }
        }}
        width={isMobile ? '96vw' : 520}
        style={isMobile ? { maxWidth: '96vw' } : {}}
        centered
      >
        <Form form={waForm} layout="vertical">
          <Form.Item name="whatsappGroupName" label="Nome do grupo (opcional)">
            <Input />
          </Form.Item>

          <Form.Item
            name="whatsappGroupLink"
            label="Link do grupo (opcional)"
            rules={[
              {
                validator: async (_, value) => {
                  if (!value) return;
                  if (!isWhatsAppGroupLink(value)) {
                    throw new Error('Informe um link válido de grupo do WhatsApp (ex: https://chat.whatsapp.com/...)');
                  }
                },
              },
            ]}
          >
            <Input
              placeholder="https://chat.whatsapp.com/..."
              addonAfter={
                <Button
                  type="text"
                  aria-label="Abrir link do grupo no WhatsApp"
                  icon={<WhatsAppOutlined style={{ color: '#25D366', fontSize: 18 }} />}
                  disabled={!safeUrl(waForm.getFieldValue('whatsappGroupLink'))}
                  onClick={() => {
                    const link = safeUrl(waForm.getFieldValue('whatsappGroupLink'));
                    if (link) window.open(link, '_blank');
                  }}
                />
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={itemOpen}
        title="Adicionar item"
        okText="Adicionar"
        confirmLoading={addItem.isPending}
        onCancel={() => setItemOpen(false)}
        onOk={async () => {
          try {
            const v = await itemForm.validateFields();
            addItem.mutate({
              equipmentName: v.equipmentName,
              equipmentCode: v.equipmentCode ?? null,
              qty: v.qty ?? 1,
            });
          } catch {}
        }}
        width={isMobile ? '96vw' : 520}
        style={isMobile ? { maxWidth: '96vw' } : {}}
        centered
      >
        <Form form={itemForm} layout="vertical" initialValues={{ qty: 1 }}>
          <Form.Item name="equipmentName" label="Nome do equipamento" rules={[{ required: true, message: 'Informe' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="equipmentCode" label="Código (opcional)">
            <Input />
          </Form.Item>
          <Form.Item name="qty" label="Quantidade" rules={[{ required: true, message: 'Informe' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={progressOpen}
        title={editingProgress ? 'Editar progresso' : 'Lançar progresso'}
        okText={editingProgress ? 'Salvar alterações' : 'Salvar'}
        confirmLoading={addProgress.isPending || updateProgress.isPending}
        onCancel={() => {
          setProgressOpen(false);
          setEditingProgress(null);
        }}
        onOk={async () => {
          try {
            const v = await progressForm.validateFields();
            const vehicles = (v.vehicles || []).map((x: any) => ({
              plate: String(x.plate || '').trim().toUpperCase(),
              serial: String(x.serial || '').trim(),
            }));

            const payload = {
              date: (v.date as Dayjs).format('YYYY-MM-DD'),
              notes: v.notes ?? null,
              vehicles,
            };

            if (editingProgress?.id) {
              updateProgress.mutate({
                progressId: editingProgress.id,
                payload,
              });
            } else {
              addProgress.mutate(payload);
            }
          } catch {}
        }}
        afterOpenChange={(o) => {
          if (o && !editingProgress) {
            progressForm.setFieldsValue({
              date: dayjs(),
              vehicles: [{ plate: '', serial: '' }],
              notes: null,
            });
            setImportSummary({
              loading: false,
              percent: 0,
              totalRows: 0,
              validRows: 0,
              importedCount: 0,
              duplicatesInFile: [],
              alreadyPublished: [],
              invalidRows: 0,
            });
          }

          if (!o) {
            setEditingProgress(null);
          }
        }}
        width={isMobile ? '96vw' : 820}
        style={isMobile ? { maxWidth: '96vw' } : {}}
        centered
      >
        <Form form={progressForm} layout="vertical">
          <Form.Item name="date" label="Data" rules={[{ required: true, message: 'Selecione a data' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" inputReadOnly />
          </Form.Item>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <Typography.Text strong>Importar via Excel</Typography.Text>

            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                await importVehiclesFromExcel(file);
                e.currentTarget.value = '';
              }}
            />

            <Button icon={<UploadOutlined />} onClick={() => excelInputRef.current?.click()}>
              Importar Excel
            </Button>
          </div>

          {(importSummary.loading || importSummary.totalRows > 0) && (
            <Card size="small" styles={{ body: { padding: 12, marginBottom: 12 } }}>
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Progress percent={importSummary.percent} status={importSummary.loading ? 'active' : 'normal'} />
                <Typography.Text type="secondary">
                  Linhas lidas: {importSummary.totalRows} • Válidas: {importSummary.importedCount} • Inválidas:{' '}
                  {importSummary.invalidRows}
                </Typography.Text>

                {!importSummary.loading && importSummary.alreadyPublished.length > 0 && (
                  <Alert
                    type="warning"
                    showIcon
                    message={`${importSummary.alreadyPublished.length} placa(s) já estavam publicadas anteriormente`}
                    description={importSummary.alreadyPublished.join(', ')}
                  />
                )}

                {!importSummary.loading && importSummary.duplicatesInFile.length > 0 && (
                  <Alert
                    type="info"
                    showIcon
                    message={`${importSummary.duplicatesInFile.length} placa(s) duplicadas no próprio Excel`}
                    description={importSummary.duplicatesInFile.join(', ')}
                  />
                )}
              </Space>
            </Card>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Typography.Text strong>Veículos instalados no dia</Typography.Text>
            <Typography.Text type="secondary">
              Total do dia: {Array.isArray(watchedVehicles) ? watchedVehicles.length : 0}
            </Typography.Text>
          </div>

          <Form.List
            name="vehicles"
            rules={[
              {
                validator: async (_, list) => {
                  if (!list || list.length < 1) throw new Error('Adicione pelo menos 1 veículo');
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map((field, idx) => {
                  const currentPlate = normalizePlate(progressForm.getFieldValue(['vehicles', field.name, 'plate']) || '');
                  const alreadyExists =
                    currentPlate &&
                    existingPublishedPlates.has(currentPlate) &&
                    !(
                      editingProgress &&
                      (editingProgress.vehicles || []).some((v) => normalizePlate(v.plate) === currentPlate)
                    );

                  return (
                    <div
                      key={field.key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto',
                        gap: 8,
                        marginBottom: 8,
                        alignItems: 'start',
                      }}
                    >
                      <div>
                        <Form.Item
                          label={idx === 0 ? 'Placa' : ''}
                          name={[field.name, 'plate']}
                          rules={[
                            { required: true, message: 'Informe a placa' },
                            {
                              validator: async (_, value) => {
                                if (!value) return;
                                if (!isValidPlate(value)) throw new Error('Placa inválida (ex: ABC-1234 ou ABC-1E34)');
                              },
                            },
                          ]}
                        >
                          <Input
                            placeholder="Ex: ABC-1234"
                            maxLength={8}
                            onChange={(e) => {
                              const formatted = normalizePlate(e.target.value);
                              progressForm.setFieldValue(['vehicles', field.name, 'plate'], formatted);
                            }}
                          />
                        </Form.Item>
                        {alreadyExists ? <Tag color="warning">Placa já publicada anteriormente</Tag> : null}
                      </div>

                      <Form.Item
                        label={idx === 0 ? 'Série / Serial' : ''}
                        name={[field.name, 'serial']}
                        rules={[
                          { required: true, message: 'Informe a série' },
                          { min: 3, message: 'Série muito curta' },
                          { max: 60, message: 'Série muito longa' },
                        ]}
                      >
                        <Input placeholder="Ex: 112334" />
                      </Form.Item>

                      <div style={{ paddingTop: isMobile ? 0 : idx === 0 ? 30 : 0 }}>
                        <Button danger onClick={() => remove(field.name)} disabled={fields.length === 1} block={isMobile}>
                          Remover
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <Form.ErrorList errors={errors} />
                <Button onClick={() => add({ plate: '', serial: '' })} block={isMobile}>
                  + Adicionar veículo
                </Button>
              </>
            )}
          </Form.List>

          <Form.Item name="notes" label="Observações (opcional)">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}