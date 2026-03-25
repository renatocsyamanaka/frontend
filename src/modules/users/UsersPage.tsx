import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Avatar,
  Button,
  Form,
  Input,
  Modal,
  Tag,
  Select,
  Upload,
  message,
  Switch,
  Space,
  Tooltip,
  Card,
  List,
  Descriptions,
  Typography,
  InputNumber,
  Spin,
  Row,
  Col,
  Grid,
  Popconfirm,
  Empty,
  Divider,
} from 'antd';
import {
  EditOutlined,
  UploadOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
  ApartmentOutlined,
  CheckOutlined,
  CloseOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { LocationSelect } from '../shared/LocationSelect';
import UserAddressModal from './UserAddressModal';
import UserMapModal from './UserMapModal';
import { MaskedInput } from 'antd-mask-input';
import { useAuth } from '../auth/AuthProvider';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

/** ===== Helpers globais (ABS URL) ===== */
const RAW_API_URL = import.meta.env.VITE_API_URL?.trim();

if (!RAW_API_URL) {
  throw new Error('VITE_API_URL não definida no arquivo .env');
}

const API_URL = RAW_API_URL.replace(/\/+$/, '');

const abs = (url?: string | null) => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL}/${String(url).replace(/^\/+/, '')}`;
};

const initial = (s?: string | null) => (s?.trim()?.[0]?.toUpperCase() ?? '?');

/** ===== Helpers telefone (MASK dinâmico) ===== */
const onlyDigits = (v?: string) => String(v || '').replace(/\D/g, '');

const phoneMask = (value?: string) => {
  const digits = onlyDigits(value);
  return digits.length > 10 ? '(00) 00000-0000' : '(00) 0000-0000';
};

const normalizeRoleName = (s?: string | null) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const WORKER_ROLE_NAMES = ['tecnico', 'pso', 'ata', 'prp', 'spot'];

const TIPO_ATENDIMENTO_OPTIONS = [
  { value: 'FX', label: 'Fixo' },
  { value: 'VL', label: 'Volante' },
  { value: 'FV', label: 'Fixo e Volante' },
];

const SECTOR_OPTIONS = [
  { value: 'OPERACOES', label: 'Operações' },
  { value: 'LOGISTICA', label: 'Logística' },
  { value: 'SISTEMAS', label: 'Sistemas' },
  { value: 'ATENDIMENTO', label: 'Atendimento' },
];

const DEFAULT_SECTORS = ['OPERACOES'];

const sectorLabelMap = SECTOR_OPTIONS.reduce<Record<string, string>>((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const getSectorLabel = (sector?: string | null) =>
  sector ? sectorLabelMap[sector] || sector : '';

const PERMISSION_OPTIONS = [
  { value: 'DASHBOARD_VIEW', label: 'Dashboard' },
  { value: 'INSTALLATION_PROJECTS_VIEW', label: 'Projetos de Instalação' },
  { value: 'PART_REQUESTS_VIEW', label: 'Pedido de Peças' },
  { value: 'MY_PART_REQUESTS_VIEW', label: 'Meus Pedidos de Peças' },
  { value: 'TECHS_MAP_VIEW', label: 'Mapa Técnicos' },
  { value: 'USERS_VIEW', label: 'Colaboradores' },
  { value: 'ORG_VIEW', label: 'Organograma' },
  { value: 'LOCATIONS_VIEW', label: 'Localidades' },
  { value: 'CLIENTS_VIEW', label: 'Clientes' },
  { value: 'TASKS_VIEW', label: 'Demandas' },
  { value: 'TECH_TYPES_VIEW', label: 'Tipos de Técnicos' },
  { value: 'NEEDS_VIEW', label: 'Requisições' },
  { value: 'NEEDS_MAP_VIEW', label: 'Mapa de Requisições' },
  { value: 'ASSIGNMENTS_VIEW', label: 'Agenda' },
  { value: 'OVERTIME_VIEW', label: 'Banco de Horas' },
  { value: 'TIMEOFF_VIEW', label: 'Folgas / Time Off' },
  { value: 'NEWS_VIEW', label: 'Notícias' },
  { value: 'NEWS_ADMIN_VIEW', label: 'Notícias Admin' },
  { value: 'DASHBOARD_ACTIVITY_VIEW', label: 'Planejamento CIA' },
  { value: 'DELIVERY_REPORTS_VIEW', label: 'CTEs' },
];

const DEFAULT_PERMISSIONS = ['DASHBOARD_VIEW', 'ASSIGNMENTS_VIEW'];

const permissionLabelMap = PERMISSION_OPTIONS.reduce<Record<string, string>>((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const getPermissionLabel = (permission?: string | null) =>
  permission ? permissionLabelMap[permission] || permission : '';

const getTipoAtendimentoLabel = (
  value?: 'FX' | 'VL' | 'FV' | null,
  descricao?: string | null
) => {
  if (descricao?.trim()) return descricao;
  if (value === 'FX') return 'Fixo';
  if (value === 'VL') return 'Volante';
  if (value === 'FV') return 'Fixo e Volante';
  return '';
};

type Role = { id: number; name: string; level: number };
type SimpleUser = { id: number; name: string };
type Location = { id: number; name: string };

type User = {
  id: number;
  name: string;
  email?: string | null;
  sex?: 'M' | 'F' | 'O' | null;
  isActive: boolean;
  loginEnabled?: boolean;
  avatarUrl?: string | null;
  role?: Role;
  manager?: SimpleUser | null;
  location?: Location | null;
  estoqueAvancado?: boolean | null;

  cargoDescritivo?: string | null;
  ocultarCargo?: boolean | null;

  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressDistrict?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  addressCountry?: string | null;
  lat?: number | null;
  lng?: number | null;

  phone?: string | null;
  vendorCode?: string | null;
  serviceAreaCode?: string | null;
  serviceAreaName?: string | null;
  tipoAtendimento?: 'FX' | 'VL' | 'FV' | null;
  tipoAtendimentoDescricao?: string | null;

  permissions?: string[] | null;
  sectors?: string[] | null;
};

type RegistrationRequest = {
  id: number;
  fullName: string;
  email: string;
  sex?: 'M' | 'F' | 'O' | null;
  phone?: string | null;
  avatarUrl?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNotes?: string | null;
  createdAt?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  role?: Role | null;
  manager?: SimpleUser | null;
  approvedBy?: SimpleUser | null;
  rejectedBy?: SimpleUser | null;
  roleId?: number;
  managerId?: number | null;
  permissions?: string[] | null;
  sectors?: string[] | null;
  cargoDescritivo?: string | null;
  ocultarCargo?: boolean | null;
};

const BASE_ROLE_OPTIONS = [
  { value: 1, label: 'Técnico' },
  { value: 2, label: 'Analista' },
  { value: 3, label: 'Supervisor' },
  { value: 4, label: 'Coordenador' },
  { value: 5, label: 'Gerente' },
  { value: 6, label: 'Diretor' },
  { value: 7, label: 'Admin' },
  { value: 8, label: 'PSO' },
  { value: 9, label: 'SPOT' },
  { value: 10, label: 'PRP' },
];

const getDisplayRoleLabel = (
  roleName?: string | null,
  cargoDescritivo?: string | null,
  ocultarCargo?: boolean | null
) => {
  if (ocultarCargo) return 'Oculto';
  return cargoDescritivo?.trim() || roleName || '—';
};

const isWorkerRoleByName = (roleName?: string | null) => {
  const r = normalizeRoleName(roleName);
  return WORKER_ROLE_NAMES.includes(r);
};

function OrgCard({
  title,
  person,
  highlight,
  badge,
}: {
  title: string;
  person: any;
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <Card
      size="small"
      style={{
        width: 320,
        maxWidth: '100%',
        borderRadius: 12,
        border: highlight ? '1px solid #93c5fd' : '1px solid #f0f0f0',
        boxShadow: highlight ? '0 6px 18px rgba(59,130,246,0.12)' : undefined,
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span>{title}</span>
          {badge ? <Tag color={highlight ? 'blue' : 'default'}>{badge}</Tag> : null}
        </div>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar src={abs(person?.avatarUrl)} size={44}>
          {initial(person?.nome)}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {person?.nome || '—'}
          </div>
          <div style={{ color: '#64748b', fontSize: 12 }}>{person?.cargo || '—'}</div>
        </div>
      </div>
    </Card>
  );
}

function OrgMiniCard({ person }: { person: any }) {
  return (
    <Card size="small" style={{ borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar src={abs(person?.avatarUrl)} size={36}>
          {initial(person?.nome)}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {person?.nome || '—'}
          </div>
          <div style={{ color: '#64748b', fontSize: 12 }}>{person?.cargo || '—'}</div>
        </div>
      </div>
    </Card>
  );
}

const requestStatusTag = (status?: string) => {
  if (status === 'PENDING') return <Tag color="gold">Pendente</Tag>;
  if (status === 'APPROVED') return <Tag color="green">Aprovada</Tag>;
  if (status === 'REJECTED') return <Tag color="red">Reprovada</Tag>;
  return <Tag>{status || '—'}</Tag>;
};

export function UsersPage() {
  const qc = useQueryClient();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { user: authUser } = useAuth();

  const myLevel = Number(authUser?.role?.level || 0);
  const canCreateWorker = myLevel >= 2;
  const canCreateAnyUser = myLevel >= 5;
  const canEditAnyUser = myLevel >= 5;
  const canReviewRegistrationRequests = myLevel >= 3;

  const [fSearch, setFSearch] = useState<string>('');
  const [fRoles, setFRoles] = useState<number[] | undefined>(undefined);
  const [fActive, setFActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [fManagerId, setFManagerId] = useState<number | undefined>(undefined);

  const [mapOpen, setMapOpen] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  const roleOptions = useMemo(() => {
    const fromData = (data || []).map((u) => u.role).filter(Boolean) as Role[];
    const uniqById = new Map<number, Role>();

    fromData.forEach((r) => {
      if (!uniqById.has(r.id)) uniqById.set(r.id, r);
    });

    const dynamic = Array.from(uniqById.values()).map((r) => ({ value: r.id, label: r.name }));
    const merged = [...dynamic];

    BASE_ROLE_OPTIONS.forEach((base) => {
      if (!merged.find((x) => x.value === base.value)) merged.push(base);
    });

    return merged.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [data]);

  const isWorkerRoleId = (roleId?: number | null) => {
    const role = roleOptions.find((r) => r.value === roleId);
    return isWorkerRoleByName(String(role?.label || ''));
  };

  const canEditTarget = (u?: User | null) => {
    if (!u) return false;
    if (canEditAnyUser) return true;
    if (myLevel >= 2 && isWorkerRoleByName(u.role?.name)) return true;
    return false;
  };

  const workerRoleOptions = useMemo(() => {
    return roleOptions.filter((r) => {
      const label = normalizeRoleName(String(r.label || ''));
      return WORKER_ROLE_NAMES.includes(label);
    });
  }, [roleOptions]);

  const managerOptions = useMemo(() => {
    const seen = new Set<number>();

    return (data || [])
      .filter((u) => {
        const level = Number(u.role?.level || 0);
        return level >= 3;
      })
      .filter((u) => {
        if (seen.has(u.id)) return false;
        seen.add(u.id);
        return true;
      })
      .map((u) => ({
        value: u.id,
        label: u.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [data]);

  const filtered = useMemo(() => {
    const list = data || [];

    return list.filter((u) => {
      if (fSearch) {
        const q = fSearch.toLowerCase();
        const inName = (u.name || '').toLowerCase().includes(q);
        const inEmail = (u.email || '').toLowerCase().includes(q);
        if (!inName && !inEmail) return false;
      }

      if (fRoles && fRoles.length > 0) {
        const rId = u.role?.id;
        if (!rId || !fRoles.includes(rId)) return false;
      }

      if (fActive === 'ACTIVE' && !u.isActive) return false;
      if (fActive === 'INACTIVE' && u.isActive) return false;
      if (fManagerId && u.manager?.id !== fManagerId) return false;

      return true;
    });
  }, [data, fSearch, fRoles, fActive, fManagerId]);

  const [workerOpen, setWorkerOpen] = useState(false);
  const [workerForm] = Form.useForm();
  const [workerAvatarFile, setWorkerAvatarFile] = useState<File | null>(null);
  const workerPhone = Form.useWatch('phone', workerForm);

  const createWorker = useMutation({
    mutationFn: async (payload: any) => (await api.post('/users/workers', payload)).data,
    onSuccess: async (u: User) => {
      if (workerAvatarFile) {
        const fd = new FormData();
        fd.append('file', workerAvatarFile);
        await api.post(`/users/${u.id}/avatar`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setWorkerAvatarFile(null);
      }

      message.success('Prestador cadastrado');
      await qc.invalidateQueries({ queryKey: ['users'] });
      setWorkerOpen(false);
      workerForm.resetFields();
    },
    onError: (e: any) => {
      console.error('workers ERROR:', e?.response?.data || e);
      message.error(e?.response?.data?.error || 'Erro ao cadastrar prestador');
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [createAvatarFile, setCreateAvatarFile] = useState<File | null>(null);
  const createPhone = Form.useWatch('phone', createForm);
  const createRoleId = Form.useWatch('roleId', createForm);
  const createSelectedIsWorker = isWorkerRoleId(createRoleId);

  const createUser = useMutation({
    mutationFn: async (payload: any) => (await api.post('/users', payload)).data,
    onSuccess: async (user: User) => {
      const v = createForm.getFieldsValue();
      const hasAddr = v.addressStreet && v.addressCity && v.addressState;

      if (hasAddr) {
        try {
          await api.patch(`/users/${user.id}/address`, {
            addressStreet: v.addressStreet,
            addressNumber: v.addressNumber || '',
            addressComplement: v.addressComplement || '',
            addressDistrict: v.addressDistrict || '',
            addressCity: v.addressCity,
            addressState: v.addressState,
            addressZip: v.addressZip || '',
            addressCountry: v.addressCountry || 'Brasil',
            autoGeocode: false,
            lat: v.lat ?? null,
            lng: v.lng ?? null,
          });
        } catch (e: any) {
          message.warning(e?.response?.data?.error || 'Endereço não foi salvo');
        }
      }

      if (createAvatarFile) {
        const fd = new FormData();
        fd.append('file', createAvatarFile);
        await api.post(`/users/${user.id}/avatar`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setCreateAvatarFile(null);
      }

      message.success('Usuário criado');
      await qc.invalidateQueries({ queryKey: ['users'] });
      setCreateOpen(false);
      createForm.resetFields();
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Erro ao criar'),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editing, setEditing] = useState<User | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const editPhone = Form.useWatch('phone', editForm);
  const editRoleId = Form.useWatch('roleId', editForm);
  const editSelectedIsWorker = isWorkerRoleId(editRoleId) || editing?.loginEnabled === false;

  const [addrOpen, setAddrOpen] = useState(false);
  const [addrUser, setAddrUser] = useState<User | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);

  const [structureOpen, setStructureOpen] = useState(false);
  const [structure, setStructure] = useState<any | null>(null);
  const [loadingStructure, setLoadingStructure] = useState(false);

  async function fetchStructure(userId: number) {
    setLoadingStructure(true);
    try {
      const res = await api.get(`/users/${userId}/structure`);
      setStructure(res.data);
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Erro ao buscar estrutura');
    } finally {
      setLoadingStructure(false);
    }
  }

  const [geoOpen, setGeoOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoResults, setGeoResults] = useState<any[]>([]);
  const [geoForForm, setGeoForForm] = useState<'create' | 'worker'>('create');
  const [geoQuery, setGeoQuery] = useState('');

  const searchGeo = async () => {
    if (!geoQuery.trim()) return;
    setGeoLoading(true);
    try {
      const items = (await api.get('/geocode', { params: { q: geoQuery } })).data as any[];
      setGeoResults(items);
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Falha na busca geográfica');
    } finally {
      setGeoLoading(false);
    }
  };

  const applyGeo = (it: any) => {
    const patch = {
      addressCity: it.city || undefined,
      addressState: it.uf || it.state || undefined,
      lat: it.lat,
      lng: it.lng,
    };

    if (geoForForm === 'create') createForm.setFieldsValue(patch);
    if (geoForForm === 'worker') workerForm.setFieldsValue(patch);

    setGeoOpen(false);
  };

  const openEditModal = (u: User) => {
    if (!canEditTarget(u)) {
      message.warning('Você não tem permissão para editar este usuário.');
      return;
    }

    setEditing(u);

    editForm.setFieldsValue({
      name: u.name,
      email: u.email || '',
      sex: u.sex || null,
      roleId: u.role?.id,
      managerId: u.manager?.id,
      isActive: u.isActive,
      phone: u.phone || '',
      cargoDescritivo: u.cargoDescritivo || '',
      ocultarCargo: !!u.ocultarCargo,
      permissions: Array.isArray(u.permissions) && u.permissions.length ? u.permissions : DEFAULT_PERMISSIONS,
      sectors: Array.isArray(u.sectors) && u.sectors.length ? u.sectors : DEFAULT_SECTORS,

      vendorCode: isWorkerRoleByName(u.role?.name) ? u.vendorCode || '' : '',
      serviceAreaCode: isWorkerRoleByName(u.role?.name) ? u.serviceAreaCode || '' : '',
      serviceAreaName: isWorkerRoleByName(u.role?.name) ? u.serviceAreaName || '' : '',
      tipoAtendimento: isWorkerRoleByName(u.role?.name) ? u.tipoAtendimento || undefined : undefined,
      estoqueAvancado: isWorkerRoleByName(u.role?.name) ? !!u.estoqueAvancado : false,
    });

    setEditOpen(true);
  };

  const updateUser = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) =>
      (await api.patch(`/users/${id}`, payload)).data,
    onSuccess: async (u: User) => {
      if (editAvatarFile) {
        const fd = new FormData();
        fd.append('file', editAvatarFile);
        await api.post(`/users/${u.id}/avatar`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setEditAvatarFile(null);
      }

      qc.setQueryData<User[]>(['users'], (old) =>
        (old || []).map((item) => (item.id === u.id ? { ...item, ...u } : item))
      );

      setViewUser((prev) => (prev && prev.id === u.id ? { ...prev, ...u } : prev));
      setEditing((prev) => (prev && prev.id === u.id ? { ...prev, ...u } : prev));
      setAddrUser((prev) => (prev && prev.id === u.id ? { ...prev, ...u } : prev));

      message.success('Usuário atualizado');

      await qc.invalidateQueries({ queryKey: ['users'] });

      setEditOpen(false);
      setEditing(null);
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Erro ao atualizar'),
  });

  /** =========================
   * SOLICITAÇÕES DE CADASTRO
   * ========================= */
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [requestSearch, setRequestSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const [editApproveOpen, setEditApproveOpen] = useState(false);
  const [editApproveForm] = Form.useForm();
  const [editingRequest, setEditingRequest] = useState<RegistrationRequest | null>(null);
  const editApprovePhone = Form.useWatch('phone', editApproveForm);

  const {
    data: registrationRequests,
    isLoading: requestsLoading,
    isFetching: requestsFetching,
    refetch: refetchRequests,
  } = useQuery<RegistrationRequest[]>({
    queryKey: ['user-registration-requests'],
    queryFn: async () => (await api.get('/user-registration-requests')).data,
    enabled: canReviewRegistrationRequests && requestsOpen,
  });

  const filteredRequests = useMemo(() => {
    const list = registrationRequests || [];

    return list.filter((r) => {
      if (requestSearch) {
        const q = requestSearch.toLowerCase();
        const inName = (r.fullName || '').toLowerCase().includes(q);
        const inEmail = (r.email || '').toLowerCase().includes(q);
        if (!inName && !inEmail) return false;
      }

      if (requestStatusFilter !== 'ALL' && r.status !== requestStatusFilter) return false;

      return true;
    });
  }, [registrationRequests, requestSearch, requestStatusFilter]);

  const approveRequest = useMutation({
    mutationFn: async (id: number) =>
      (await api.put(`/user-registration-requests/${id}/approve`, {
        permissions: DEFAULT_PERMISSIONS,
        sectors: DEFAULT_SECTORS,
      })).data,
    onSuccess: async () => {
      message.success('Solicitação aprovada com sucesso');
      await qc.invalidateQueries({ queryKey: ['user-registration-requests'] });
      await qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Erro ao aprovar solicitação');
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async ({ id, reviewNotes }: { id: number; reviewNotes?: string | null }) =>
      (await api.put(`/user-registration-requests/${id}/reject`, { reviewNotes: reviewNotes || null })).data,
    onSuccess: async () => {
      message.success('Solicitação reprovada');
      await qc.invalidateQueries({ queryKey: ['user-registration-requests'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Erro ao reprovar solicitação');
    },
  });

  const approveRequestWithEdit = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) =>
      (await api.put(`/user-registration-requests/${id}/approve`, payload)).data,
    onSuccess: async () => {
      message.success('Solicitação editada e aprovada com sucesso');
      await qc.invalidateQueries({ queryKey: ['user-registration-requests'] });
      await qc.invalidateQueries({ queryKey: ['users'] });
      setEditApproveOpen(false);
      setEditingRequest(null);
      editApproveForm.resetFields();
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Erro ao editar/aprovar solicitação');
    },
  });

  const openEditApproveModal = (req: RegistrationRequest) => {
    setEditingRequest(req);
    editApproveForm.setFieldsValue({
      fullName: req.fullName,
      email: req.email,
      sex: req.sex || null,
      roleId: req.role?.id || req.roleId || undefined,
      managerId: req.manager?.id || req.managerId || undefined,
      phone: req.phone || '',
      reviewNotes: req.reviewNotes || '',
      cargoDescritivo: req.cargoDescritivo || '',
      ocultarCargo: !!req.ocultarCargo,
      permissions:
        Array.isArray(req.permissions) && req.permissions.length
          ? req.permissions
          : DEFAULT_PERMISSIONS,
      sectors:
        Array.isArray(req.sectors) && req.sectors.length
          ? req.sectors
          : DEFAULT_SECTORS,
    });
    setEditApproveOpen(true);
  };

  const viewUserIsWorker = isWorkerRoleByName(viewUser?.role?.name);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Row gutter={[12, 12]} align="middle" justify="space-between">
        <Col xs={24} md="auto">
          <h2 style={{ margin: 0 }}>Colaboradores</h2>
        </Col>

        <Col xs={24} md="auto">
          <Space
            wrap
            style={{
              width: '100%',
              justifyContent: isMobile ? 'flex-start' : 'flex-end',
            }}
          >
            <Button block={isMobile} icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
              Atualizar
            </Button>

            {canReviewRegistrationRequests && (
              <Button
                block={isMobile}
                icon={<UserAddOutlined />}
                onClick={() => {
                  setRequestsOpen(true);
                  refetchRequests();
                }}
              >
                Solicitações de cadastro
              </Button>
            )}

            {canCreateAnyUser && (
              <Button block={isMobile} type="primary" onClick={() => setCreateOpen(true)}>
                Novo usuário
              </Button>
            )}

            {canCreateWorker && (
              <Button block={isMobile} onClick={() => setWorkerOpen(true)}>
                Cadastrar prestador
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      <Card size="small">
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8} lg={7}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Buscar por nome ou e-mail"
              value={fSearch}
              onChange={(e) => setFSearch(e.target.value)}
            />
          </Col>

          <Col xs={24} md={8} lg={7}>
            <Select
              mode="multiple"
              allowClear
              placeholder="Filtrar por cargo"
              value={fRoles}
              onChange={(vals) => setFRoles(vals as number[] | undefined)}
              options={roleOptions}
              optionFilterProp="label"
              style={{ width: '100%' }}
            />
          </Col>

          <Col xs={24} md={8} lg={4}>
            <Select
              value={fActive}
              onChange={(v) => setFActive(v)}
              style={{ width: '100%' }}
              options={[
                { value: 'ALL', label: 'Todos' },
                { value: 'ACTIVE', label: 'Ativos' },
                { value: 'INACTIVE', label: 'Inativos' },
              ]}
            />
          </Col>

          <Col xs={24} md={12} lg={4}>
            <Select
              allowClear
              showSearch
              placeholder="Filtrar por gestor"
              value={fManagerId}
              onChange={(v) => setFManagerId(v)}
              options={managerOptions}
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
            />
          </Col>

          <Col xs={24} md={12} lg={2}>
            <Button
              block
              onClick={() => {
                setFSearch('');
                setFRoles(undefined);
                setFActive('ALL');
                setFManagerId(undefined);
              }}
            >
              Limpar
            </Button>
          </Col>
        </Row>
      </Card>

      <List
        loading={isLoading}
        grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 4, xxl: 4 }}
        dataSource={filtered}
        rowKey={(u) => u.id}
        pagination={{
          pageSize: 12,
          showSizeChanger: false,
          hideOnSinglePage: true,
          align: 'end',
        }}
        renderItem={(u) => {
          const atendimentoLabel = getTipoAtendimentoLabel(u.tipoAtendimento, u.tipoAtendimentoDescricao);
          const userIsWorker = isWorkerRoleByName(u.role?.name);

          return (
            <List.Item>
              <Card hoverable styles={{ body: { padding: 16 } }}>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                    marginBottom: 10,
                  }}
                >
                  {u.isActive ? <Tag color="green">Ativo</Tag> : <Tag>Inativo</Tag>}
                  {userIsWorker && !!u.estoqueAvancado && <Tag color="purple">Estoque Avançado</Tag>}
                  {userIsWorker && !!atendimentoLabel && <Tag color="cyan">{atendimentoLabel}</Tag>}
                  {u.ocultarCargo && <Tag color="default">Cargo oculto</Tag>}
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Avatar src={abs(u.avatarUrl)} size={56}>
                    {u.name?.[0]}
                  </Avatar>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Title
                      level={5}
                      style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {u.name}
                    </Title>

                    <div style={{ color: '#64748b' }}>
                      {getDisplayRoleLabel(u.role?.name, u.cargoDescritivo, u.ocultarCargo)}
                    </div>
                    <div style={{ color: '#94a3b8' }}>Gestor: {u.manager?.name || '-'}</div>

                    {Array.isArray(u.sectors) && u.sectors.length > 0 && (
                      <div style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Setor: {u.sectors.map(getSectorLabel).join(', ')}
                      </div>
                    )}

                    {userIsWorker && !!atendimentoLabel && (
                      <div style={{ color: '#94a3b8' }}>Atendimento: {atendimentoLabel}</div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Button
                    block={isMobile}
                    icon={<EyeOutlined />}
                    onClick={() => {
                      setViewUser(u);
                      setViewOpen(true);
                    }}
                  >
                    Informações
                  </Button>

                  <Button
                    block={isMobile}
                    icon={<ApartmentOutlined />}
                    onClick={() => {
                      setViewUser(u);
                      setStructureOpen(true);
                      fetchStructure(u.id);
                    }}
                  >
                    Estrutura
                  </Button>
                </div>
              </Card>
            </List.Item>
          );
        }}
      />

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar src={abs(viewUser?.avatarUrl)} size={48}>
              {viewUser?.name?.[0]}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600 }}>{viewUser?.name}</div>
              <div style={{ color: '#64748b', fontSize: 12 }}>
                {getDisplayRoleLabel(viewUser?.role?.name, viewUser?.cargoDescritivo, viewUser?.ocultarCargo)}
              </div>
            </div>
          </div>
        }
        open={viewOpen}
        onCancel={() => {
          setViewOpen(false);
          setViewUser(null);
        }}
        footer={
          <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Tooltip title={viewUser?.lat && viewUser?.lng ? 'Ver no mapa' : 'Sem coordenadas'}>
              <Button
                icon={<EnvironmentOutlined />}
                disabled={!(Number.isFinite(Number(viewUser?.lat)) && Number.isFinite(Number(viewUser?.lng)))}
                onClick={() => setMapOpen(true)}
              >
                Ver no mapa
              </Button>
            </Tooltip>

            {canEditTarget(viewUser) && (
              <Button
                icon={<HomeOutlined />}
                onClick={() => {
                  if (!viewUser) return;
                  setAddrUser(viewUser);
                  setAddrOpen(true);
                }}
              >
                Endereço
              </Button>
            )}

            {canEditTarget(viewUser) && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  if (!viewUser) return;
                  openEditModal(viewUser);
                }}
              >
                Editar
              </Button>
            )}

            <Button
              onClick={() => {
                setViewOpen(false);
                setViewUser(null);
              }}
            >
              Fechar
            </Button>
          </Space>
        }
        destroyOnHidden
        width={isMobile ? '100%' : 980}
        style={isMobile ? { top: 0, padding: 0 } : undefined}
      >
        {viewUser && (
          <Row gutter={[12, 12]}>
            <Col xs={24} md={viewUserIsWorker ? 8 : 12}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Card size="small" title="Profissional">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Cargo descritivo">
                      {viewUser.ocultarCargo ? 'Oculto' : viewUser.cargoDescritivo || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Gestor">{viewUser.manager?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Status">{viewUser.isActive ? 'Ativo' : 'Inativo'}</Descriptions.Item>
                    <Descriptions.Item label="Login">
                      {viewUser.loginEnabled === false ? 'Sem login' : 'Com login'}
                    </Descriptions.Item>
                    {viewUserIsWorker && (
                      <Descriptions.Item label="Estoque Avançado">
                        {viewUser.estoqueAvancado ? 'Sim' : 'Não'}
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Setor">
                      {Array.isArray(viewUser.sectors) && viewUser.sectors.length > 0
                        ? viewUser.sectors.map(getSectorLabel).join(', ')
                        : '—'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card size="small" title="Contato">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="E-mail">{viewUser.email || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Telefone">{viewUser.phone || '—'}</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Space>
            </Col>

            {viewUserIsWorker && (
              <Col xs={24} md={8}>
                <Card size="small" title="Área de atendimento">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Código fornecedor">{viewUser.vendorCode || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Código da área">{viewUser.serviceAreaCode || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Nome da área">{viewUser.serviceAreaName || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Tipo de atendimento">
                      {getTipoAtendimentoLabel(viewUser.tipoAtendimento, viewUser.tipoAtendimentoDescricao) || '—'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card size="small" title="Permissões" style={{ marginTop: 12 }}>
                  {Array.isArray(viewUser.permissions) && viewUser.permissions.length > 0 ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {viewUser.permissions.map((permission) => (
                        <Tag key={permission} color="blue">
                          {getPermissionLabel(permission)}
                        </Tag>
                      ))}
                    </div>
                  ) : (
                    <Text type="secondary">Sem permissões definidas</Text>
                  )}
                </Card>
              </Col>
            )}

            {!viewUserIsWorker && (
              <Col xs={24} md={12}>
                <Card size="small" title="Permissões">
                  {Array.isArray(viewUser.permissions) && viewUser.permissions.length > 0 ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {viewUser.permissions.map((permission) => (
                        <Tag key={permission} color="blue">
                          {getPermissionLabel(permission)}
                        </Tag>
                      ))}
                    </div>
                  ) : (
                    <Text type="secondary">Sem permissões definidas</Text>
                  )}
                </Card>
              </Col>
            )}

            <Col xs={24} md={viewUserIsWorker ? 8 : 12}>
              <Card size="small" title="Endereço">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Logradouro">
                    {viewUser.addressStreet || '—'} {viewUser.addressNumber || ''}
                  </Descriptions.Item>
                  <Descriptions.Item label="Complemento">{viewUser.addressComplement || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Bairro">{viewUser.addressDistrict || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Cidade/UF">
                    {viewUser.addressCity || '—'}
                    {viewUser.addressState ? ` / ${viewUser.addressState}` : ''}
                  </Descriptions.Item>
                  <Descriptions.Item label="CEP">{viewUser.addressZip || '—'}</Descriptions.Item>
                  <Descriptions.Item label="País">{viewUser.addressCountry || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Coordenadas">
                    {viewUser.lat && viewUser.lng ? (
                      <Tag
                        color="green"
                        style={{
                          maxWidth: '100%',
                          display: 'inline-block',
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                        }}
                      >
                        {viewUser.lat}, {viewUser.lng}
                      </Tag>
                    ) : (
                      <Tag>Sem coordenadas</Tag>
                    )}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>
        )}
      </Modal>

      <UserMapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        title={`Mapa — ${viewUser?.name || ''}`}
        lat={viewUser?.lat}
        lng={viewUser?.lng}
        addressLabel={[
          viewUser?.addressStreet,
          viewUser?.addressNumber,
          viewUser?.addressDistrict,
          viewUser?.addressCity,
          viewUser?.addressState,
          viewUser?.addressZip,
        ]
          .filter(Boolean)
          .join(', ')}
      />

      {canCreateAnyUser && (
        <Modal
          title="Novo colaborador"
          open={createOpen}
          onCancel={() => {
            setCreateOpen(false);
            setCreateAvatarFile(null);
            createForm.resetFields();
          }}
          onOk={() => createForm.submit()}
          destroyOnHidden
          width={isMobile ? '100%' : 980}
          style={isMobile ? { top: 0, padding: 0 } : undefined}
        >
          <Form
            layout="vertical"
            form={createForm}
            initialValues={{
              permissions: DEFAULT_PERMISSIONS,
              sectors: DEFAULT_SECTORS,
              ocultarCargo: false,
            }}
            onFinish={(v) => {
              const isWorker = isWorkerRoleId(v.roleId);

              const payload = {
                name: v.name,
                email: v.email,
                password: v.password,
                sex: v.sex,
                roleId: v.roleId,
                managerId: v.managerId ?? null,
                locationId: v.locationId ?? null,
                phone: v.phone || null,
                cargoDescritivo: v.cargoDescritivo?.trim() || null,
                ocultarCargo: !!v.ocultarCargo,
                vendorCode: isWorker ? v.vendorCode || null : null,
                serviceAreaCode: isWorker ? v.serviceAreaCode || null : null,
                serviceAreaName: isWorker ? v.serviceAreaName || null : null,
                tipoAtendimento: isWorker ? v.tipoAtendimento || null : null,
                estoqueAvancado: isWorker ? !!v.estoqueAvancado : false,
                sectors:
                  Array.isArray(v.sectors) && v.sectors.length
                    ? v.sectors
                    : DEFAULT_SECTORS,
                permissions:
                  Array.isArray(v.permissions) && v.permissions.length
                    ? v.permissions
                    : DEFAULT_PERMISSIONS,
              };
              createUser.mutate(payload);
            }}
          >
            <Row gutter={[12, 12]}>
              <Col xs={24}>
                <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="email" label="E-mail" rules={[{ required: true, type: 'email' }]}>
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="password" label="Senha" rules={[{ required: true, min: 6 }]}>
                  <Input.Password />
                </Form.Item>
              </Col>

              <Col xs={24} md={12} lg={8}>
                <Form.Item name="sex" label="Sexo">
                  <Select
                    allowClear
                    options={[
                      { value: 'M', label: 'Masculino' },
                      { value: 'F', label: 'Feminino' },
                      { value: 'O', label: 'Outro' },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12} lg={8}>
                <Form.Item name="roleId" label="Cargo" rules={[{ required: true }]}>
                  <Select options={roleOptions} optionFilterProp="label" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12} lg={8}>
                <Form.Item name="cargoDescritivo" label="Cargo descritivo">
                  <Input placeholder="Ex.: Coordenador de Dados / Supervisor de Operações" maxLength={150} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12} lg={8}>
                <Form.Item name="managerId" label="Gestor">
                  <Select
                    allowClear
                    showSearch
                    placeholder="Selecione o gestor"
                    options={managerOptions}
                    optionFilterProp="label"
                    filterOption={(input, option) =>
                      String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12} lg={8}>
                <Form.Item name="phone" label="Telefone">
                  <MaskedInput mask={phoneMask(createPhone)} placeholder="(11) 99999-9999" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12} lg={8}>
                <Form.Item
                  name="ocultarCargo"
                  label="Ocultar cargo"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="Sim" unCheckedChildren="Não" />
                </Form.Item>
              </Col>

              {createSelectedIsWorker && (
                <>
                  <Col xs={24} md={12} lg={8}>
                    <Form.Item name="vendorCode" label="Cód do fornecedor">
                      <Input />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12} lg={12}>
                    <Form.Item name="serviceAreaCode" label="Cód da área de atendimento">
                      <Input />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12} lg={12}>
                    <Form.Item name="serviceAreaName" label="Nome da área de atendimento">
                      <Input />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12} lg={12}>
                    <Form.Item name="tipoAtendimento" label="Tipo de atendimento">
                      <Select allowClear placeholder="Selecione" options={TIPO_ATENDIMENTO_OPTIONS} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12} lg={12}>
                    <Form.Item
                      name="estoqueAvancado"
                      label="Pertence ao Estoque Avançado?"
                      valuePropName="checked"
                      initialValue={false}
                    >
                      <Switch checkedChildren="Sim" unCheckedChildren="Não" />
                    </Form.Item>
                  </Col>
                </>
              )}

              <Col xs={24}>
                <Form.Item
                  name="sectors"
                  label="Setor"
                  rules={[{ required: true, message: 'Selecione ao menos um setor' }]}
                >
                  <Select
                    mode="multiple"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Selecione o(s) setor(es) do usuário"
                    options={SECTOR_OPTIONS}
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  name="permissions"
                  label="Abas / Permissões de acesso"
                  rules={[{ required: true, message: 'Selecione ao menos uma permissão' }]}
                  tooltip="Selecione as páginas que esse usuário poderá acessar"
                >
                  <Select
                    mode="multiple"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Selecione as abas liberadas para este usuário"
                    options={PERMISSION_OPTIONS}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Card size="small" title="Endereço (opcional)" style={{ marginTop: 8 }}>
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <Form.Item name="addressStreet" label="Logradouro">
                    <Input placeholder="Rua/Avenida" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="addressNumber" label="Número">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="addressComplement" label="Complemento">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="addressDistrict" label="Bairro">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="addressCity" label="Cidade">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="addressState" label="UF/Estado">
                    <Input placeholder="SP, RJ..." />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="addressZip" label="CEP">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="addressCountry" label="País" initialValue="Brasil">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="lat" label="Latitude">
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="-22.90" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="lng" label="Longitude">
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="-43.17" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12} style={{ display: 'flex', alignItems: 'end' }}>
                  <Button
                    block={isMobile}
                    icon={<SearchOutlined />}
                    onClick={() => {
                      setGeoForForm('create');
                      setGeoOpen(true);
                      setGeoResults([]);
                      setGeoQuery('');
                    }}
                  >
                    Buscar coordenadas
                  </Button>
                </Col>
              </Row>
            </Card>

            <Form.Item label="Foto (opcional)" style={{ marginTop: 8 }}>
              <Upload
                accept="image/*"
                maxCount={1}
                beforeUpload={(file) => {
                  setCreateAvatarFile(file);
                  return false;
                }}
                onRemove={() => setCreateAvatarFile(null)}
                listType="picture"
              >
                <Button icon={<UploadOutlined />}>Selecionar foto</Button>
              </Upload>
            </Form.Item>
          </Form>
        </Modal>
      )}

      <Modal
        title={`Editar: ${editing?.name || ''}`}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setEditing(null);
          setEditAvatarFile(null);
        }}
        onOk={() => editForm.submit()}
        destroyOnHidden
        width={isMobile ? '100%' : 980}
        style={isMobile ? { top: 0, padding: 0 } : undefined}
      >
        <Form
          layout="vertical"
          form={editForm}
          onFinish={(v) => {
            const isWorker = isWorkerRoleId(v.roleId);

            const payload: any = {
              name: v.name,
              email: v.email || null,
              sex: v.sex,
              roleId: v.roleId,
              managerId: v.managerId ?? null,
              isActive: v.isActive,
              phone: v.phone ?? null,
              cargoDescritivo: v.cargoDescritivo?.trim() || null,
              ocultarCargo: !!v.ocultarCargo,
              sectors:
                Array.isArray(v.sectors) && v.sectors.length
                  ? v.sectors
                  : DEFAULT_SECTORS,
              permissions:
                Array.isArray(v.permissions) && v.permissions.length
                  ? v.permissions
                  : DEFAULT_PERMISSIONS,

              vendorCode: isWorker ? v.vendorCode ?? null : null,
              serviceAreaCode: isWorker ? v.serviceAreaCode ?? null : null,
              serviceAreaName: isWorker ? v.serviceAreaName ?? null : null,
              tipoAtendimento: isWorker ? v.tipoAtendimento ?? null : null,
              estoqueAvancado: isWorker ? !!v.estoqueAvancado : false,
            };

            updateUser.mutate({ id: editing!.id, payload });
          }}
        >
          <Row gutter={[12, 12]}>
            <Col xs={24}>
              <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="roleId" label="Cargo">
                <Select
                  allowClear
                  options={canEditAnyUser ? roleOptions : workerRoleOptions}
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="cargoDescritivo" label="Cargo descritivo">
                <Input placeholder="Ex.: Supervisor de Atendimento / Coordenador de Operações" maxLength={150} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="ocultarCargo"
                label="Ocultar cargo"
                valuePropName="checked"
              >
                <Switch checkedChildren="Sim" unCheckedChildren="Não" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="managerId" label="Gestor">
                <Select
                  allowClear
                  showSearch
                  placeholder="Selecione o gestor"
                  options={managerOptions}
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="email"
                label="E-mail"
                rules={
                  editSelectedIsWorker
                    ? [{ type: 'email', message: 'E-mail inválido' }]
                    : [{ required: true, type: 'email' }]
                }
              >
                <Input placeholder={editSelectedIsWorker ? 'Opcional para prestador sem login' : ''} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="sex" label="Sexo">
                <Select
                  allowClear
                  options={[
                    { value: 'M', label: 'Masculino' },
                    { value: 'F', label: 'Feminino' },
                    { value: 'O', label: 'Outro' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="phone" label="Telefone">
                <MaskedInput mask={phoneMask(editPhone)} placeholder="(11) 99999-9999" />
              </Form.Item>
            </Col>

            {editSelectedIsWorker && (
              <>
                <Col xs={24} md={12} lg={8}>
                  <Form.Item name="vendorCode" label="Código do fornecedor">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12} lg={8}>
                  <Form.Item name="serviceAreaCode" label="Código da área">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12} lg={8}>
                  <Form.Item name="serviceAreaName" label="Nome da área">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12} lg={8}>
                  <Form.Item name="tipoAtendimento" label="Tipo de atendimento">
                    <Select allowClear placeholder="Selecione" options={TIPO_ATENDIMENTO_OPTIONS} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12} lg={8}>
                  <Form.Item
                    name="estoqueAvancado"
                    label="Pertence ao Estoque Avançado?"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="Sim" unCheckedChildren="Não" />
                  </Form.Item>
                </Col>
              </>
            )}

            <Col xs={24}>
              <Form.Item
                name="sectors"
                label="Setor"
                rules={[{ required: true, message: 'Selecione ao menos um setor' }]}
              >
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Selecione o(s) setor(es) do usuário"
                  options={SECTOR_OPTIONS}
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="permissions"
                label="Abas / Permissões de acesso"
                rules={[{ required: true, message: 'Selecione ao menos uma permissão' }]}
              >
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Selecione as abas liberadas para este usuário"
                  options={PERMISSION_OPTIONS}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="isActive" label="Ativo" valuePropName="checked" style={{ marginTop: 8 }}>
                <Switch />
              </Form.Item>
            </Col>

            <Col xs={24} md={18}>
              <Form.Item label="Foto (trocar)">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Avatar src={abs(editing?.avatarUrl)} size={40}>
                    {editing?.name?.[0]}
                  </Avatar>

                  <Upload
                    accept="image/*"
                    maxCount={1}
                    beforeUpload={(file) => {
                      setEditAvatarFile(file);
                      return false;
                    }}
                    onRemove={() => setEditAvatarFile(null)}
                    listType="picture"
                  >
                    <Button icon={<UploadOutlined />}>Selecionar foto</Button>
                  </Upload>
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {addrUser && (
        <UserAddressModal
          open={addrOpen}
          userId={addrUser.id}
          initial={{
            addressStreet: addrUser.addressStreet || '',
            addressNumber: addrUser.addressNumber || '',
            addressComplement: addrUser.addressComplement || '',
            addressDistrict: addrUser.addressDistrict || '',
            addressCity: addrUser.addressCity || '',
            addressState: addrUser.addressState || '',
            addressZip: addrUser.addressZip || '',
            addressCountry: addrUser.addressCountry || 'Brasil',
            lat: addrUser.lat ?? null,
            lng: addrUser.lng ?? null,
          }}
          onSaved={(patch) => {
            setAddrUser((prev) => (prev ? { ...prev, ...patch } : prev) as any);
            setViewUser((prev) => (prev ? { ...prev, ...patch } : prev) as any);
          }}
          onClose={async () => {
            setAddrOpen(false);
            setAddrUser(null);
            await qc.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}

      <Modal
        title="Buscar coordenadas (Nominatim)"
        open={geoOpen}
        onCancel={() => setGeoOpen(false)}
        footer={null}
        destroyOnHidden
        width={isMobile ? '100%' : 900}
        style={isMobile ? { top: 0, padding: 0 } : undefined}
      >
        <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
          <Input
            placeholder="Ex.: Rua XV de Novembro, Curitiba"
            value={geoQuery}
            onChange={(e) => setGeoQuery(e.target.value)}
            onPressEnter={searchGeo}
          />
          <Button type="primary" icon={<SearchOutlined />} loading={geoLoading} onClick={searchGeo}>
            Buscar
          </Button>
        </Space.Compact>

        <List
          bordered
          locale={{ emptyText: 'Nenhum resultado' }}
          dataSource={geoResults}
          renderItem={(item: any) => (
            <List.Item actions={[<Button type="link" onClick={() => applyGeo(item)}>Usar</Button>]}>
              <List.Item.Meta
                title={item.label}
                description={
                  <>
                    <div>
                      <b>lat/lng:</b> {item.lat}, {item.lng}
                    </div>
                    <div>
                      <b>cidade:</b> {item.city || '—'} • <b>UF:</b> {item.uf || '—'}
                    </div>
                  </>
                }
              />
            </List.Item>
          )}
        />
      </Modal>

      {canCreateWorker && (
        <Modal
          title="Cadastrar prestador"
          open={workerOpen}
          onCancel={() => {
            setWorkerOpen(false);
            workerForm.resetFields();
            setWorkerAvatarFile(null);
          }}
          onOk={() => workerForm.submit()}
          destroyOnHidden
          width={isMobile ? '100%' : 980}
          style={isMobile ? { top: 0, padding: 0 } : undefined}
        >
          <Form
            layout="vertical"
            form={workerForm}
            initialValues={{ sectors: DEFAULT_SECTORS, ocultarCargo: false }}
            onFinish={(v) => {
              const payload = {
                name: v.name,
                phone: v.phone || null,
                roleId: v.roleId,
                managerId: v.managerId ?? null,
                estoqueAvancado: !!v.estoqueAvancado,
                vendorCode: v.vendorCode || null,
                serviceAreaCode: v.serviceAreaCode || null,
                serviceAreaName: v.serviceAreaName || null,
                tipoAtendimento: v.tipoAtendimento || null,
                cargoDescritivo: v.cargoDescritivo?.trim() || null,
                ocultarCargo: !!v.ocultarCargo,
                sectors:
                  Array.isArray(v.sectors) && v.sectors.length
                    ? v.sectors
                    : DEFAULT_SECTORS,
                addressStreet: v.addressStreet,
                addressNumber: v.addressNumber || '',
                addressComplement: v.addressComplement || '',
                addressDistrict: v.addressDistrict || '',
                addressCity: v.addressCity,
                addressState: v.addressState,
                addressZip: v.addressZip || '',
                addressCountry: v.addressCountry || 'Brasil',
                lat: v.lat,
                lng: v.lng,
              };
              createWorker.mutate(payload);
            }}
          >
            <Row gutter={[12, 12]}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="roleId"
                  label="Cargo"
                  rules={[{ required: true, message: 'Selecione o cargo do prestador' }]}
                >
                  <Select placeholder="Selecione" optionFilterProp="label" options={workerRoleOptions} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="phone" label="Telefone">
                  <MaskedInput mask={phoneMask(workerPhone)} placeholder="(11) 99999-9999" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="cargoDescritivo" label="Cargo descritivo">
                  <Input placeholder="Ex.: Técnico de Campo / PSO Operacional" maxLength={150} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="ocultarCargo" label="Ocultar cargo" valuePropName="checked">
                  <Switch checkedChildren="Sim" unCheckedChildren="Não" />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item name="managerId" label="Gestor (opcional)">
                  <Select
                    allowClear
                    showSearch
                    placeholder="Selecione o gestor"
                    options={managerOptions}
                    optionFilterProp="label"
                    filterOption={(input, option) =>
                      String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  name="estoqueAvancado"
                  label="Pertence ao Estoque Avançado?"
                  valuePropName="checked"
                  initialValue={false}
                >
                  <Switch checkedChildren="Sim" unCheckedChildren="Não" />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item name="vendorCode" label="Código do fornecedor">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item name="serviceAreaCode" label="Código da área de atendimento">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item name="serviceAreaName" label="Nome da área de atendimento">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item name="tipoAtendimento" label="Tipo de atendimento">
                  <Select allowClear placeholder="Selecione" options={TIPO_ATENDIMENTO_OPTIONS} />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  name="sectors"
                  label="Setor"
                  rules={[{ required: true, message: 'Selecione ao menos um setor' }]}
                >
                  <Select
                    mode="multiple"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Selecione o(s) setor(es) do prestador"
                    options={SECTOR_OPTIONS}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Card size="small" title="Endereço (obrigatório)" style={{ marginTop: 8 }}>
              <Row gutter={[12, 12]}>
                <Col xs={24} md={8}>
                  <Form.Item name="addressZip" label="CEP">
                    <Input
                      placeholder="00000-000"
                      onBlur={async (e) => {
                        const raw = (e.target.value || '').replace(/\D/g, '');
                        if (!raw) return;
                        try {
                          const resp = await api.get('/users/cep', { params: { cep: raw } });
                          workerForm.setFieldsValue({
                            addressStreet: resp.data.addressStreet ?? undefined,
                            addressDistrict: resp.data.addressDistrict ?? undefined,
                            addressCity: resp.data.addressCity ?? undefined,
                            addressState: resp.data.addressState ?? undefined,
                            addressCountry: resp.data.addressCountry ?? 'Brasil',
                            addressZip: resp.data.addressZip ?? e.target.value,
                          });
                        } catch {
                          message.warning('Não foi possível buscar o CEP.');
                        }
                      }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={16} />

                <Col xs={24}>
                  <Form.Item name="addressStreet" label="Logradouro" rules={[{ required: true }]}>
                    <Input placeholder="Rua/Avenida" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="addressNumber" label="Número">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={16}>
                  <Form.Item name="addressComplement" label="Complemento">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={10}>
                  <Form.Item name="addressDistrict" label="Bairro">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={10}>
                  <Form.Item name="addressCity" label="Cidade" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={4}>
                  <Form.Item name="addressState" label="UF/Estado" rules={[{ required: true }]}>
                    <Input placeholder="SP, RJ..." />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="addressCountry" label="País" initialValue="Brasil">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="lat" label="Latitude" rules={[{ required: true, message: 'Informe a latitude' }]}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="-22.90" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item name="lng" label="Longitude" rules={[{ required: true, message: 'Informe a longitude' }]}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="-43.17" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12} style={{ display: 'flex', alignItems: 'end' }}>
                  <Button
                    block={isMobile}
                    icon={<SearchOutlined />}
                    onClick={() => {
                      setGeoForForm('worker');
                      setGeoOpen(true);
                      setGeoResults([]);
                      setGeoQuery('');
                    }}
                  >
                    Buscar coordenadas
                  </Button>
                </Col>
              </Row>
            </Card>

            <Form.Item label="Foto (opcional)" style={{ marginTop: 8 }}>
              <Upload
                accept="image/*"
                maxCount={1}
                beforeUpload={(file) => {
                  setWorkerAvatarFile(file);
                  return false;
                }}
                onRemove={() => setWorkerAvatarFile(null)}
                listType="picture"
              >
                <Button icon={<UploadOutlined />}>Selecionar foto</Button>
              </Upload>
            </Form.Item>
          </Form>
        </Modal>
      )}

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ApartmentOutlined />
            <span>Estrutura — {viewUser?.name || ''}</span>
          </div>
        }
        open={structureOpen}
        onCancel={() => {
          setStructureOpen(false);
          setStructure(null);
        }}
        footer={null}
        width={isMobile ? '100%' : 980}
        style={isMobile ? { top: 0, padding: 0 } : undefined}
        styles={{ body: { background: '#fafafa'} }}
        destroyOnHidden
      >
        {loadingStructure ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : structure ? (
          <div style={{ padding: 8 }}>
            <div
              style={{
                position: 'relative',
                padding: 16,
                borderRadius: 12,
                background: '#fff',
                border: '1px solid #f0f0f0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {structure.acima && structure.acima.length > 0 ? (
                  <OrgCard title="Superior" person={structure.acima[0]} badge="ACIMA" />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: 10 }}>— sem superior —</div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 2, height: 22, background: '#e5e7eb', margin: '10px 0' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {structure.atual ? (
                  <OrgCard title="Colaborador" person={structure.atual} highlight badge="ATUAL" />
                ) : null}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 2, height: 22, background: '#e5e7eb', margin: '10px 0' }} />
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Title level={5} style={{ margin: 0 }}>
                    Subordinados
                  </Title>
                  <Tag color="blue">{(structure.abaixo || []).length}</Tag>
                </div>

                {structure.abaixo && structure.abaixo.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {structure.abaixo.map((p: any) => (
                      <OrgMiniCard key={p.id || p.email || p.nome} person={p} />
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8' }}>— nenhum subordinado —</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <Text type="secondary">Selecione um colaborador</Text>
        )}
      </Modal>

      <Modal
        title="Solicitações de cadastro"
        open={requestsOpen}
        onCancel={() => setRequestsOpen(false)}
        footer={null}
        destroyOnHidden
        width={isMobile ? '100%' : 1100}
        style={isMobile ? { top: 0, padding: 0 } : undefined}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Buscar por nome ou e-mail"
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
              />
            </Col>

            <Col xs={24} md={6}>
              <Select
                value={requestStatusFilter}
                onChange={(v) => setRequestStatusFilter(v)}
                style={{ width: '100%' }}
                options={[
                  { value: 'ALL', label: 'Todos os status' },
                  { value: 'PENDING', label: 'Pendentes' },
                  { value: 'APPROVED', label: 'Aprovadas' },
                  { value: 'REJECTED', label: 'Reprovadas' },
                ]}
              />
            </Col>

            <Col xs={24} md={6}>
              <Button block icon={<ReloadOutlined />} loading={requestsFetching} onClick={() => refetchRequests()}>
                Atualizar
              </Button>
            </Col>
          </Row>

          {requestsLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin />
            </div>
          ) : !filteredRequests.length ? (
            <Empty description="Nenhuma solicitação encontrada" />
          ) : (
            <List
              dataSource={filteredRequests}
              rowKey={(r) => r.id}
              renderItem={(req) => (
                <List.Item style={{ paddingInline: 0 }}>
                  <Card style={{ width: '100%' }} bodyStyle={{ padding: 16 }}>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} lg={14}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <Avatar src={abs(req.avatarUrl)} size={56}>
                            {initial(req.fullName)}
                          </Avatar>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                              <Title level={5} style={{ margin: 0 }}>
                                {req.fullName}
                              </Title>
                              {requestStatusTag(req.status)}
                            </div>

                            <div style={{ color: '#64748b', marginTop: 4 }}>{req.email}</div>

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                              <Tag>
                                {getDisplayRoleLabel(req.role?.name, req.cargoDescritivo, req.ocultarCargo)}
                              </Tag>
                              <Tag>{req.manager?.name ? `Gestor: ${req.manager.name}` : 'Sem gestor'}</Tag>

                              {Array.isArray(req.sectors) && req.sectors.length > 0 && (
                                <Tag color="purple">
                                  Setor: {req.sectors.map(getSectorLabel).join(', ')}
                                </Tag>
                              )}

                              {req.phone ? <Tag>{req.phone}</Tag> : null}
                            </div>

                            {Array.isArray(req.permissions) && req.permissions.length > 0 && (
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                                {req.permissions.map((permission) => (
                                  <Tag key={permission} color="blue">
                                    {getPermissionLabel(permission)}
                                  </Tag>
                                ))}
                              </div>
                            )}

                            <Descriptions
                              size="small"
                              column={isMobile ? 1 : 2}
                              style={{ marginTop: 12 }}
                              items={[
                                {
                                  key: 'sexo',
                                  label: 'Sexo',
                                  children:
                                    req.sex === 'M'
                                      ? 'Masculino'
                                      : req.sex === 'F'
                                      ? 'Feminino'
                                      : req.sex === 'O'
                                      ? 'Outro'
                                      : '—',
                                },
                                {
                                  key: 'dataSolicitacao',
                                  label: 'Solicitado em',
                                  children: req.createdAt
                                    ? new Date(req.createdAt).toLocaleString('pt-BR')
                                    : '—',
                                },
                                {
                                  key: 'cargoDescritivo',
                                  label: 'Cargo descritivo',
                                  children: req.ocultarCargo ? 'Oculto' : req.cargoDescritivo || '—',
                                },
                                {
                                  key: 'aprovadoPor',
                                  label: 'Aprovado por',
                                  children: req.approvedBy?.name || '—',
                                },
                              ]}
                            />

                            {req.reviewNotes ? (
                              <>
                                <Divider style={{ margin: '12px 0' }} />
                                <Text type="secondary">Observação:</Text>
                                <div style={{ marginTop: 4 }}>{req.reviewNotes}</div>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </Col>

                      <Col xs={24} lg={10}>
                        <div
                          style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}
                        >
                          <Card size="small" title="Ações" styles={{ body: { padding: 12 } }}>
                            {req.status !== 'PENDING' ? (
                              <Text type="secondary">Solicitação já analisada.</Text>
                            ) : (
                              <Space wrap>
                                <Popconfirm
                                  title="Aprovar solicitação?"
                                  description="Isso criará o usuário definitivo com permissões e setor padrão."
                                  onConfirm={() => approveRequest.mutate(req.id)}
                                  okText="Aprovar"
                                  cancelText="Cancelar"
                                >
                                  <Button
                                    type="primary"
                                    icon={<CheckOutlined />}
                                    loading={approveRequest.isPending}
                                  >
                                    Aprovar
                                  </Button>
                                </Popconfirm>

                                <Button
                                  icon={<EditOutlined />}
                                  onClick={() => openEditApproveModal(req)}
                                >
                                  Editar e aprovar
                                </Button>

                                <Popconfirm
                                  title="Reprovar solicitação?"
                                  description="Essa ação marcará a solicitação como recusada."
                                  onConfirm={() =>
                                    rejectRequest.mutate({
                                      id: req.id,
                                      reviewNotes: 'Solicitação reprovada pelo gestor',
                                    })
                                  }
                                  okText="Reprovar"
                                  cancelText="Cancelar"
                                >
                                  <Button
                                    danger
                                    icon={<CloseOutlined />}
                                    loading={rejectRequest.isPending}
                                  >
                                    Reprovar
                                  </Button>
                                </Popconfirm>
                              </Space>
                            )}
                          </Card>
                        </div>
                      </Col>
                    </Row>
                  </Card>
                </List.Item>
              )}
            />
          )}
        </div>
      </Modal>

      <Modal
        title={`Editar e aprovar${editingRequest ? ` — ${editingRequest.fullName}` : ''}`}
        open={editApproveOpen}
        onCancel={() => {
          setEditApproveOpen(false);
          setEditingRequest(null);
          editApproveForm.resetFields();
        }}
        onOk={() => editApproveForm.submit()}
        destroyOnHidden
        width={isMobile ? '100%' : 920}
        style={isMobile ? { top: 0, padding: 0 } : undefined}
      >
        <Form
          layout="vertical"
          form={editApproveForm}
          initialValues={{
            permissions: DEFAULT_PERMISSIONS,
            sectors: DEFAULT_SECTORS,
            ocultarCargo: false,
          }}
          onFinish={(v) => {
            if (!editingRequest) return;

            const payload = {
              fullName: v.fullName,
              email: v.email,
              sex: v.sex || null,
              roleId: v.roleId,
              managerId: v.managerId ?? null,
              phone: v.phone || null,
              reviewNotes: v.reviewNotes || null,
              cargoDescritivo: v.cargoDescritivo?.trim() || null,
              ocultarCargo: !!v.ocultarCargo,
              sectors:
                Array.isArray(v.sectors) && v.sectors.length
                  ? v.sectors
                  : DEFAULT_SECTORS,
              permissions:
                Array.isArray(v.permissions) && v.permissions.length
                  ? v.permissions
                  : DEFAULT_PERMISSIONS,
            };

            approveRequestWithEdit.mutate({ id: editingRequest.id, payload });
          }}
        >
          <Row gutter={[12, 12]}>
            <Col xs={24}>
              <Form.Item name="fullName" label="Nome completo" rules={[{ required: true, message: 'Informe o nome' }]}>
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label="E-mail"
                rules={[
                  { required: true, message: 'Informe o e-mail' },
                  { type: 'email', message: 'E-mail inválido' },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="phone" label="Telefone">
                <MaskedInput mask={phoneMask(editApprovePhone)} placeholder="(11) 99999-9999" />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="sex" label="Sexo">
                <Select
                  allowClear
                  options={[
                    { value: 'M', label: 'Masculino' },
                    { value: 'F', label: 'Feminino' },
                    { value: 'O', label: 'Outro' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={9}>
              <Form.Item name="roleId" label="Cargo" rules={[{ required: true, message: 'Selecione o cargo' }]}>
                <Select options={roleOptions} optionFilterProp="label" showSearch />
              </Form.Item>
            </Col>

            <Col xs={24} md={9}>
              <Form.Item name="managerId" label="Gestor">
                <Select
                  allowClear
                  showSearch
                  placeholder="Selecione o gestor"
                  options={managerOptions}
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="cargoDescritivo" label="Cargo descritivo">
                <Input placeholder="Ex.: Supervisor de Atendimento / Coordenador de Dados" maxLength={150} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="ocultarCargo" label="Ocultar cargo" valuePropName="checked">
                <Switch checkedChildren="Sim" unCheckedChildren="Não" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="sectors"
                label="Setor"
                rules={[{ required: true, message: 'Selecione ao menos um setor' }]}
              >
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Selecione o(s) setor(es) do usuário"
                  options={SECTOR_OPTIONS}
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="permissions"
                label="Abas / Permissões de acesso"
                rules={[{ required: true, message: 'Selecione ao menos uma permissão' }]}
                tooltip="Escolha exatamente quais abas esse usuário poderá acessar após a aprovação"
              >
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Selecione as abas liberadas"
                  options={PERMISSION_OPTIONS}
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item name="reviewNotes" label="Observação do aprovador">
                <Input.TextArea rows={4} placeholder="Ex.: aprovado com ajuste de cargo / gestor / permissões / setor" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}