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
} from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { UserSelect } from '../shared/UserSelect';
import { LocationSelect } from '../shared/LocationSelect';
import UserAddressModal from './UserAddressModal';
import { useNavigate } from 'react-router-dom';
import UserMapModal from './UserMapModal';
import { MaskedInput } from 'antd-mask-input';

const { Title, Text } = Typography;

/** ===== Helpers globais (ABS URL) ===== */
const API_URL = import.meta.env.VITE_API_URL || 'https://api.projetos-rc.online/api';
const abs = (url?: string | null) => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL}/${String(url).replace(/^\/+/, '')}`;
};

/** ===== Helpers telefone (MASK dinâmico) ===== */
const onlyDigits = (v?: string) => String(v || '').replace(/\D/g, '');

const phoneMask = (value?: string) => {
  const digits = onlyDigits(value);

  // digits inclui DDD
  // 10 dígitos => (11) 9999-9999  (fixo)
  // 11 dígitos => (11) 99999-9999 (celular)
  return digits.length > 10 ? '(00) 00000-0000' : '(00) 0000-0000';
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

  // endereço + coords (visualização e modal de endereço)
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

  // extras
  phone?: string | null;
  vendorCode?: string | null;
  serviceAreaCode?: string | null;
  serviceAreaName?: string | null;
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
];

export function UsersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  // listagem
  const { data, isLoading, isFetching, refetch } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  // ======= filtros =======
  const [fSearch, setFSearch] = useState<string>('');
  const [fRoles, setFRoles] = useState<number[] | undefined>(undefined);
  const [fActive, setFActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [fManagerId, setFManagerId] = useState<number | undefined>(undefined);
  const [fLocationId, setFLocationId] = useState<number | undefined>(undefined);
  const [mapOpen, setMapOpen] = useState(false);

  const roleOptions = useMemo(() => {
    const fromData = (data || []).map((u) => u.role).filter(Boolean) as Role[];

    const uniqById = new Map<number, Role>();
    fromData.forEach((r) => {
      if (!uniqById.has(r.id)) uniqById.set(r.id, r);
    });

    const dynamic = Array.from(uniqById.values()).map((r) => ({
      value: r.id,
      label: r.name,
    }));

    const merged = [...dynamic];
    BASE_ROLE_OPTIONS.forEach((base) => {
      if (!merged.find((x) => x.value === base.value)) merged.push(base);
    });

    return merged.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [data]);

  const filtered = useMemo(() => {
    const list = data || [];

    return list.filter((u) => {
      if (fSearch) {
        const q = fSearch.toLowerCase();
        const inName = (u.name || '').toLowerCase().includes(q);
        const inEmail = (u.email || '')?.toLowerCase().includes(q);
        if (!inName && !inEmail) return false;
      }
      if (fRoles && fRoles.length > 0) {
        const rId = u.role?.id;
        if (!rId || !fRoles.includes(rId)) return false;
      }
      if (fActive === 'ACTIVE' && !u.isActive) return false;
      if (fActive === 'INACTIVE' && u.isActive) return false;
      if (fManagerId && u.manager?.id !== fManagerId) return false;
      if (fLocationId && u.location?.id !== fLocationId) return false;
      return true;
    });
  }, [data, fSearch, fRoles, fActive, fManagerId, fLocationId]);

  // ======= criar técnico/pso =======
  const [workerOpen, setWorkerOpen] = useState(false);
  const [workerForm] = Form.useForm();
  const [workerAvatarFile, setWorkerAvatarFile] = useState<File | null>(null);

  // 👇 watch telefone worker
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
      message.success('Técnico/PSO cadastrado');
      await qc.invalidateQueries({ queryKey: ['users'] });
      setWorkerOpen(false);
      workerForm.resetFields();
    },
    onError: (e: any) => {
      console.error('workers ERROR:', e?.response?.data || e);
      message.error(e?.response?.data?.error || 'Erro ao cadastrar técnico/PSO');
    },
  });

  // ======= criar =======
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [createAvatarFile, setCreateAvatarFile] = useState<File | null>(null);

  // 👇 watch telefone create
  const createPhone = Form.useWatch('phone', createForm);

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

  const createUser = useMutation({
    mutationFn: async (payload: any) => (await api.post('/users', payload)).data,
    onSuccess: async (user: User) => {
      // se houver endereço mínimo, faz PATCH /users/:id/address
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

      // avatar
      if (createAvatarFile) {
        const fd = new FormData();
        fd.append('file', createAvatarFile);
        await api.post(`/users/${user.id}/avatar`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setCreateAvatarFile(null);
      }

      message.success('Usuário criado');
      qc.invalidateQueries({ queryKey: ['users'] });
      setCreateOpen(false);
      createForm.resetFields();
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Erro ao criar'),
  });

  // ======= editar (SEM endereço aqui) =======
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editing, setEditing] = useState<User | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);

  // 👇 watch telefone edit
  const editPhone = Form.useWatch('phone', editForm);

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

      message.success('Usuário atualizado');
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditOpen(false);
      setEditing(null);
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Erro ao atualizar'),
  });

  // ======= endereço (EDITA SÓ NO MODAL) =======
  const [addrOpen, setAddrOpen] = useState(false);
  const [addrUser, setAddrUser] = useState<User | null>(null);

  // ======= visualizar =======
  const [viewOpen, setViewOpen] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);

  // ======= GEOCODE (somente CREATE e WORKER) =======
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

  // helper puxa inicial do nome
  const initial = (s?: string) => (s?.trim()?.[0]?.toUpperCase() ?? '?');

  const PersonLine: React.FC<{ p: any }> = ({ p }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <Avatar src={abs(p.avatarUrl)} size={28}>
        {initial(p.nome)}
      </Avatar>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Text strong ellipsis style={{ lineHeight: 1.1 }}>
          {p.nome}
        </Text>
        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.1 }}>
          {p.cargo || '—'}
        </Text>
      </div>
    </div>
  );
type PhoneInputProps = {
  form: any; // FormInstance
  name?: string;
  placeholder?: string;
};

function PhoneInput({ form, name = "phone", placeholder = "(11) 99999-9999" }: PhoneInputProps) {
  const watched = Form.useWatch(name, form) as string | undefined;

  const digits = String(watched ?? "").replace(/\D/g, "");

  // Regra BR: celular normalmente começa com 9 após o DDD.
  // digits[0..1] = DDD, digits[2] = primeiro díito do número.
  const isMobile = digits.length >= 3 && digits[2] === "9";

  const mask = isMobile ? "(00) 00000-0000" : "(00) 0000-0000";

  return (
    <MaskedInput
      mask={mask}
      inputMode="tel"
      placeholder={placeholder}
      onBlur={() => {
        // só para "ajeitar" o texto caso o usuário cole sem máscara
        const d = String(form.getFieldValue(name) ?? "").replace(/\D/g, "");

        // fixo: 10 dígitos (2 DDD + 8)
        if (d.length === 10) {
          form.setFieldsValue({
            [name]: d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3"),
          });
        }

        // celular: 11 dígitos (2 DDD + 9)
        if (d.length === 11) {
          form.setFieldsValue({
            [name]: d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3"),
          });
        }
      }}
    />
  );
}
  // ======= UI =======
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Header + ações */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Colaboradores</h2>
        <Space>
          <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
            Atualizar
          </Button>
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            Novo usuário
          </Button>
          <Button onClick={() => setWorkerOpen(true)}>Cadastrar técnico/PSO</Button>
        </Space>
      </div>

      {/* Filtros */}
      <Card size="small">
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Buscar por nome ou e-mail"
            style={{ width: 260 }}
            value={fSearch}
            onChange={(e) => setFSearch(e.target.value)}
          />

          <Select
            mode="multiple"
            allowClear
            style={{ minWidth: 280 }}
            placeholder="Filtrar por cargo (Gerente, Coordenador, Supervisor, Técnico, PSO...)"
            value={fRoles}
            onChange={(vals) => setFRoles(vals as number[] | undefined)}
            options={roleOptions}
            optionFilterProp="label"
          />

          <Select
            value={fActive}
            onChange={(v) => setFActive(v)}
            style={{ width: 180 }}
            options={[
              { value: 'ALL', label: 'Todos' },
              { value: 'ACTIVE', label: 'Ativos' },
              { value: 'INACTIVE', label: 'Inativos' },
            ]}
          />

          <div style={{ minWidth: 260 }}>
            <UserSelect
              allowClear
              onlyManagers
              placeholder="Filtrar por gestor"
              onChange={(v) => setFManagerId(v as number | undefined)}
            />
          </div>

          <div style={{ minWidth: 260 }}>
            <LocationSelect
              allowClear
              placeholder="Filtrar por local"
              onChange={(v) => setFLocationId(v as number | undefined)}
            />
          </div>

          <Button
            onClick={() => {
              setFSearch('');
              setFRoles(undefined);
              setFActive('ALL');
              setFManagerId(undefined);
              setFLocationId(undefined);
            }}
          >
            Limpar
          </Button>
        </Space>
      </Card>

      {/* Grade de cards */}
<List
  loading={isLoading}
  grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 4, xxl: 4 }}
  dataSource={filtered}
  rowKey={(u) => u.id}
renderItem={(u) => (
  <List.Item>
    <Card hoverable bodyStyle={{ padding: 16, position: 'relative' }}>
      {/* ✅ TAGS coladas na borda superior direita */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          zIndex: 2,
        }}
      >
        {u.loginEnabled === false && <Tag color="blue">Sem login</Tag>}
        {u.isActive ? <Tag color="green">Ativo</Tag> : <Tag>Inativo</Tag>}
      </div>

      {/* ✅ Conteúdo com espaço no topo pra não bater nas tags */}
      <div style={{ paddingTop: 26 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Avatar src={abs(u.avatarUrl)} size={64}>
            {u.name?.[0]}
          </Avatar>

          <div style={{ flex: 1, minWidth: 0 }}>
            <Title level={5} style={{ margin: 0 }}>
              {u.name}
            </Title>

            <div style={{ color: '#64748b' }}>{u.role?.name || '-'}</div>
            <div style={{ color: '#94a3b8' }}>Gestor: {u.manager?.name || '-'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
          <Button icon={<EyeOutlined />} onClick={() => { setViewUser(u); setViewOpen(true); }}>
            Informações
          </Button>

          <Button
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
      </div>
    </Card>
  </List.Item>
)}

/>


      {/* ===== Modal VISUALIZAR ===== */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar src={abs(viewUser?.avatarUrl)} size={48}>
              {viewUser?.name?.[0]}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600 }}>{viewUser?.name}</div>
              <div style={{ color: '#64748b', fontSize: 12 }}>{viewUser?.role?.name || '-'}</div>
            </div>
          </div>
        }
        open={viewOpen}
        onCancel={() => { setViewOpen(false); setViewUser(null); }}
        footer={
          <Space>
            <Tooltip title={viewUser?.lat && viewUser?.lng ? 'Ver no mapa' : 'Sem coordenadas'}>
              <Button
                icon={<EnvironmentOutlined />}
                disabled={!(Number.isFinite(Number(viewUser?.lat)) && Number.isFinite(Number(viewUser?.lng)))}
                onClick={() => setMapOpen(true)}
              >
                Ver no mapa
              </Button>
            </Tooltip>

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

            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                if (!viewUser) return;
                setEditing(viewUser);

                editForm.setFieldsValue({
                  name: viewUser.name,
                  email: viewUser.email || '',
                  sex: viewUser.sex || null,
                  roleId: viewUser.role?.id,
                  managerId: viewUser.manager?.id,
                  locationId: viewUser.location?.id,
                  isActive: viewUser.isActive,
                  phone: viewUser.phone || '',
                  vendorCode: viewUser.vendorCode || '',
                  serviceAreaCode: viewUser.serviceAreaCode || '',
                  serviceAreaName: viewUser.serviceAreaName || '',
                });

                setEditOpen(true);
              }}
            >
              Editar
            </Button>

            <Button onClick={() => { setViewOpen(false); setViewUser(null); }}>Fechar</Button>
          </Space>
        }
        destroyOnHidden
        width={720}
      >
        {viewUser && (
          <Row gutter={16}>
            <Col span={8}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Card size="small" title="Profissional">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Cargo">{viewUser.role?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Gestor">{viewUser.manager?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Local">{viewUser.location?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Status">{viewUser.isActive ? 'Ativo' : 'Inativo'}</Descriptions.Item>
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

            <Col span={8}>
              <Card size="small" title="Área de atendimento">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Código fornecedor">{viewUser.vendorCode || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Código da área">{viewUser.serviceAreaCode || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Nome da área">{viewUser.serviceAreaName || '—'}</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>

            <Col span={8}>
              <Card size="small" title="Endereço">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Logradouro">
                    {viewUser.addressStreet || '—'} {viewUser.addressNumber || ''}
                  </Descriptions.Item>
                  <Descriptions.Item label="Complemento">{viewUser.addressComplement || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Bairro">{viewUser.addressDistrict || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Cidade/UF">
                    {(viewUser.addressCity || '—')}{viewUser.addressState ? ` / ${viewUser.addressState}` : ''}
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
        ].filter(Boolean).join(', ')}
      />

      {/* ===== Modal CRIAR ===== */}
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
      >
        <Form
          layout="vertical"
          form={createForm}
          onFinish={(v) => {
            const payload = {
              name: v.name,
              email: v.email,
              password: v.password,
              sex: v.sex,
              roleId: v.roleId,
              managerId: v.managerId ?? null,
              locationId: v.locationId ?? null,
              phone: v.phone || null,
              vendorCode: v.vendorCode || null,
              serviceAreaCode: v.serviceAreaCode || null,
              serviceAreaName: v.serviceAreaName || null,
            };
            createUser.mutate(payload);
          }}
        >
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="email" label="E-mail" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="password" label="Senha" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>

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

          <Form.Item name="roleId" label="Cargo" rules={[{ required: true }]}>
            <Select options={roleOptions} optionFilterProp="label" />
          </Form.Item>

          <Form.Item name="managerId" label="Gestor">
            <UserSelect onlyManagers />
          </Form.Item>

          <Form.Item name="locationId" label="Local">
            <LocationSelect />
          </Form.Item>

          {/* EXTRAS */}
          <Form.Item name="phone" label="Telefone">
            <MaskedInput
              mask={phoneMask(createPhone)}
              placeholder="(11) 99999-9999"
            />
          </Form.Item>

          <Form.Item name="vendorCode" label="Cód do fornecedor">
            <Input />
          </Form.Item>

          <Form.Item name="serviceAreaCode" label="Cód da área de atendimento">
            <Input />
          </Form.Item>

          <Form.Item name="serviceAreaName" label="Nome da área de atendimento">
            <Input />
          </Form.Item>

          {/* ENDEREÇO + BUSCA COORDENADAS */}
          <Card size="small" title="Endereço (opcional)" style={{ marginTop: 8 }}>
            <Form.Item name="addressStreet" label="Logradouro">
              <Input placeholder="Rua/Avenida" />
            </Form.Item>

            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="addressNumber" label="Número" style={{ flex: 1 }}>
                <Input />
              </Form.Item>
              <Form.Item name="addressComplement" label="Complemento" style={{ flex: 1, marginLeft: 8 }}>
                <Input />
              </Form.Item>
            </Space.Compact>

            <Form.Item name="addressDistrict" label="Bairro">
              <Input />
            </Form.Item>

            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="addressCity" label="Cidade" style={{ flex: 1 }}>
                <Input />
              </Form.Item>
              <Form.Item name="addressState" label="UF/Estado" style={{ flex: 1, marginLeft: 8 }}>
                <Input placeholder="SP, RJ..." />
              </Form.Item>
            </Space.Compact>

            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="addressZip" label="CEP" style={{ flex: 1 }}>
                <Input />
              </Form.Item>
              <Form.Item
                name="addressCountry"
                label="País"
                style={{ flex: 1, marginLeft: 8 }}
                initialValue="Brasil"
              >
                <Input />
              </Form.Item>
            </Space.Compact>

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <Form.Item name="lat" label="Latitude" style={{ flex: 1 }}>
                <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="-22.90" />
              </Form.Item>
              <Form.Item name="lng" label="Longitude" style={{ flex: 1 }}>
                <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="-43.17" />
              </Form.Item>
              <Button
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
            </div>
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

      {/* ===== Modal EDITAR (SEM ENDEREÇO) ===== */}
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
        width={860}
      >
        <Form
          layout="vertical"
          form={editForm}
          onFinish={(v) => {
            const payload: any = {
              name: v.name,
              email: v.email,
              sex: v.sex,
              roleId: v.roleId,
              managerId: v.managerId ?? null,
              locationId: v.locationId ?? null,
              isActive: v.isActive,

              phone: v.phone ?? null,
              vendorCode: v.vendorCode ?? null,
              serviceAreaCode: v.serviceAreaCode ?? null,
              serviceAreaName: v.serviceAreaName ?? null,
            };

            updateUser.mutate({ id: editing!.id, payload });
          }}
        >
          <Row gutter={[16, 12]}>
            <Col xs={24} md={24}>
              <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="roleId" label="Cargo">
                <Select allowClear options={roleOptions} optionFilterProp="label" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="managerId" label="Gestor">
                <UserSelect onlyManagers />
              </Form.Item>
            </Col>

            {editing?.loginEnabled ? (
              <Col xs={24} md={12} lg={8}>
                <Form.Item name="locationId" label="Local">
                  <LocationSelect />
                </Form.Item>
              </Col>
            ) : (
              <Col xs={24} md={12} lg={8} />
            )}

            {editing?.loginEnabled && (
              <>
                <Col xs={24} md={12} lg={8}>
                  <Form.Item name="email" label="E-mail" rules={[{ required: true, type: 'email' }]}>
                    <Input />
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
              </>
            )}

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="phone" label="Telefone">
                <MaskedInput
                  mask={[
                    { mask: "(00) 0000-0000" },
                    { mask: "(00) 00000-0000" },
                  ]}
                  placeholder="(11) 99999-9999"
                />
              </Form.Item>
            </Col>

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

            <Col xs={24} md={24} lg={8}>
              <Form.Item name="serviceAreaName" label="Nome da área">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={6} lg={5}>
              <Form.Item name="isActive" label="Ativo" valuePropName="checked" style={{ marginTop: 8 }}>
                <Switch />
              </Form.Item>
            </Col>

            <Col xs={24} md={18} lg={19}>
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

      {/* ===== Modal ENDEREÇO (único lugar que edita endereço) ===== */}
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

      {/* ===== Modal de busca geográfica ===== */}
      <Modal
        title="Buscar coordenadas (Nominatim)"
        open={geoOpen}
        onCancel={() => setGeoOpen(false)}
        onOk={() => setGeoOpen(false)}
        okButtonProps={{ style: { display: 'none' } }}
        destroyOnHidden
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
                    <div><b>lat/lng:</b> {item.lat}, {item.lng}</div>
                    <div><b>cidade:</b> {item.city || '—'} • <b>UF:</b> {item.uf || '—'}</div>
                  </>
                }
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* ===== Modal Cadastrar técnico/PSO ===== */}
      <Modal
        title="Cadastrar técnico/PSO"
        open={workerOpen}
        onCancel={() => { setWorkerOpen(false); workerForm.resetFields(); setWorkerAvatarFile(null); }}
        onOk={() => workerForm.submit()}
        destroyOnHidden
        width={900}
      >
        <Form
          layout="vertical"
          form={workerForm}
          onFinish={(v) => {
            const payload = {
              name: v.name,
              phone: v.phone || null,
              roleId: v.roleId,
              managerId: v.managerId ?? null,
              vendorCode: v.vendorCode || null,
              serviceAreaCode: v.serviceAreaCode || null,
              serviceAreaName: v.serviceAreaName || null,
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
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 320px', gap: 12 }}>
            <Form.Item name="roleId" label="Cargo" rules={[{ required: true, message: 'Selecione Técnico ou PSO' }]}>
              <Select
                placeholder="Selecione"
                optionFilterProp="label"
                options={roleOptions.filter((r) => ['Técnico', 'Tecnico', 'PSO'].includes(r.label))}
              />
            </Form.Item>

            <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
              <Input />
            </Form.Item>

            <Form.Item name="phone" label="Telefone">
              <MaskedInput
                mask={phoneMask(workerPhone)}
                placeholder="(11) 99999-9999"
              />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <Form.Item name="managerId" label="Gestor (opcional)">
              <UserSelect onlyManagers allowClear placeholder="Selecione o gestor" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '320px 320px 1fr', gap: 12 }}>
            <Form.Item name="vendorCode" label="Código do fornecedor">
              <Input />
            </Form.Item>
            <Form.Item name="serviceAreaCode" label="Código da área de atendimento">
              <Input />
            </Form.Item>
            <Form.Item name="serviceAreaName" label="Nome da área de atendimento">
              <Input />
            </Form.Item>
          </div>

          <Card size="small" title="Endereço (obrigatório)" style={{ marginTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '220px auto', gap: 12 }}>
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
              <div />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              <Form.Item name="addressStreet" label="Logradouro" rules={[{ required: true }]}>
                <Input placeholder="Rua/Avenida" />
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 12 }}>
              <Form.Item name="addressNumber" label="Número">
                <Input />
              </Form.Item>
              <Form.Item name="addressComplement" label="Complemento">
                <Input />
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px', gap: 12 }}>
              <Form.Item name="addressDistrict" label="Bairro">
                <Input />
              </Form.Item>
              <Form.Item name="addressCity" label="Cidade" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="addressState" label="UF/Estado" rules={[{ required: true }]}>
                <Input placeholder="SP, RJ..." />
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="addressCountry" label="País" initialValue="Brasil">
                <Input />
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
              <Form.Item name="lat" label="Latitude" rules={[{ required: true, message: 'Informe a latitude' }]}>
                <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="-22.90" />
              </Form.Item>
              <Form.Item name="lng" label="Longitude" rules={[{ required: true, message: 'Informe a longitude' }]}>
                <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="-43.17" />
              </Form.Item>

              <Button
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
            </div>
          </Card>

          <Form.Item label="Foto (opcional)" style={{ marginTop: 8 }}>
            <Upload
              accept="image/*"
              maxCount={1}
              beforeUpload={(file) => { setWorkerAvatarFile(file); return false; }}
              onRemove={() => setWorkerAvatarFile(null)}
              listType="picture"
            >
              <Button icon={<UploadOutlined />}>Selecionar foto</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

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
      width={920}
      bodyStyle={{ background: '#fafafa' }}
    >
      {loadingStructure ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : structure ? (
        <div style={{ padding: 8 }}>
          {/* ===== ORG WRAP ===== */}
          <div
            style={{
              position: 'relative',
              padding: 16,
              borderRadius: 12,
              background: '#fff',
              border: '1px solid #f0f0f0',
            }}
          >
            {/* ===== SUPERIOR ===== */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {structure.acima && structure.acima.length > 0 ? (
                <OrgCard
                  title="Superior"
                  person={structure.acima[0]}
                  badge="ACIMA"
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 10 }}>
                  — sem superior —
                </div>
              )}
            </div>

            {/* linha vertical superior -> atual */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: 2,
                  height: 22,
                  background: '#e5e7eb',
                  margin: '10px 0',
                }}
              />
            </div>

            {/* ===== ATUAL ===== */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {structure.atual ? (
                <OrgCard
                  title="Colaborador"
                  person={structure.atual}
                  highlight
                  badge="ATUAL"
                />
              ) : null}
            </div>

            {/* linha vertical atual -> abaixo */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: 2,
                  height: 22,
                  background: '#e5e7eb',
                  margin: '10px 0',
                }}
              />
            </div>

            {/* ===== SUBORDINADOS ===== */}
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
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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

    </div>
  );
}
