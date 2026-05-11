import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileAddOutlined,
  FileImageOutlined,
  MailOutlined,
  PlusOutlined,
  ProjectOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { api } from '../../lib/api';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

type ActivityLog = {
  id: number;
  module?: string;
  action?: string;
  entity?: string;
  entityId?: number | string;
  description?: string;
  method?: string;
  path?: string;
  route?: string;
  statusCode?: number;
  status?: number;
  request?: any;
  response?: any;
  before?: any;
  after?: any;
  createdAt?: string;
  updatedAt?: string;
  userId?: number;
  userName?: string;
  userEmail?: string;
  user?: {
    id?: number;
    name?: string;
    email?: string;
  };
};

type UserLite = {
  id: number;
  name: string;
  email?: string | null;
  role?: {
    id?: number;
    name?: string;
    level?: number;
  };
};

const ACTION_LABELS: Record<string, string> = {
  USUARIO_ATUALIZADO: 'Usuário atualizado',
  WORKER_CRIADO: 'Prestador criado',
  WORKER_CREATED: 'Prestador criado',
  PEDIDO_EXCLUIDO: 'Pedido excluído',
  PEDIDO_INTERNO_CRIADO: 'Pedido interno criado',
  ITEM_CRIADO: 'Item criado',
  ITEM_EXCLUIDO: 'Item excluído',
  EMAIL_DIARIO_ENVIADO: 'E-mail diário enviado',
  EMAIL_INICIAL_ENVIADO: 'E-mail inicial enviado',
  EMAIL_FINAL_ENVIADO: 'E-mail final enviado',
  DEMANDA_CRIADA: 'Demanda criada',
  DEMANDA_ATUALIZADA: 'Demanda atualizada',
  DEMANDA_EXCLUIDA: 'Demanda excluída',
  STATUS_ALTERADO: 'Status alterado',
  ESTRUTURA_VISUALIZADA: 'Estrutura visualizada',
  LOGO_RELATORIO_DIARIO_ENVIADA: 'Logo do relatório enviada',
  LOGO_RELATORIO_DIARIO_EXCLUIDA: 'Logo do relatório excluída',
  CONFIG_RELATORIO_DIARIO_ATUALIZADA: 'Configuração do relatório diário atualizada',
  PROJETO_ATUALIZADO: 'Projeto atualizado',
  PROJETO_EXCLUIDO: 'Projeto excluído',
  PROGRESSO_CRIADO: 'Progresso criado',
  PROGRESSO_EXCLUIDO: 'Progresso excluído',
  SENHA_USUARIO_ALTERADA: 'Senha de usuário alterada',
  SENHA_ALTERADA: 'Senha alterada',
};

const COMMON_ACTION_OPTIONS = Object.entries(ACTION_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  name: 'Nome',
  nome: 'Nome',
  title: 'Título',
  email: 'E-mail',
  phone: 'Telefone',
  telefone: 'Telefone',
  sex: 'Sexo',
  roleId: 'Cargo / Perfil',
  cargoDescritivo: 'Cargo descritivo',
  managerId: 'Gestor responsável',
  sectors: 'Setores',
  setores: 'Setores',
  isActive: 'Ativo',
  ocultarCargo: 'Ocultar cargo',
  estoqueAvancado: 'Estoque avançado',
  vendorCode: 'Código do prestador',
  permissions: 'Permissões',
  serviceAreaCode: 'Código área de serviço',
  serviceAreaName: 'Nome área de serviço',
  tipoAtendimento: 'Tipo de atendimento',
  status: 'Status',
  urgencia: 'Urgência',
  descricao: 'Descrição',
  description: 'Descrição',
  workspace: 'Workspace',
  plataforma: 'Plataforma',
  solicitante: 'Solicitante',
  responsavelId: 'Responsável',
  responsavelNome: 'Responsável',
  dataEntrega: 'Data de entrega',
  entregaPrevista: 'Entrega prevista',
  periodicidade: 'Periodicidade',
  observacoes: 'Observações',
  date: 'Data',
  emailTo: 'E-mails enviados',
  sendAll: 'Enviar para todos',
  reportType: 'Tipo de relatório',
  dailyReportColorDone: 'Cor concluído',
  dailyReportHeaderColor: 'Cor do cabeçalho',
  dailyReportColorPending: 'Cor pendente',
  dailyReportClientLogoUrl: 'Logo do cliente',
  dailyReportOmnilinkLogoUrl: 'Logo Omnilink',
  automaticDailyReportEnabled: 'Envio automático ativo',
  automaticReportType: 'Tipo de relatório automático',
  automaticReportTime: 'Horário de envio automático',
  lat: 'Latitude',
  lng: 'Longitude',
  latitude: 'Latitude',
  longitude: 'Longitude',
  itemName: 'Item',
  itemId: 'Item',
  quantity: 'Quantidade',
  quantidade: 'Quantidade',
  projectId: 'Projeto',
  filename: 'Arquivo',
  fileName: 'Arquivo',
  url: 'URL',
  logoUrl: 'URL da logo',
  collaboratorName: 'Colaborador',
  collaboratorEmail: 'E-mail do colaborador',
  userId: 'Usuário',
  af: 'AF',
  clientName: 'Cliente',
  customerName: 'Cliente',
  trucksTotal: 'Total de veículos',
  trucksDone: 'Veículos realizados',
  equipmentsTotal: 'Total de equipamentos',
  equipmentsPerDay: 'Equipamentos por dia',
  saleDate: 'Data de venda',
  startPlannedAt: 'Início planejado',
  endPlannedAt: 'Fim planejado',
  contactEmail: 'E-mail de contato',
  contactEmails: 'E-mails de contato',
  targetUserId: 'Usuário alterado',
  targetUserName: 'Nome do usuário alterado',
  targetUserEmail: 'E-mail do usuário alterado',
  changedUserId: 'Usuário alterado',
  changedUserName: 'Nome do usuário alterado',
  changedUserEmail: 'E-mail do usuário alterado',
  affectedUserId: 'Usuário alterado',
  affectedUserName: 'Nome do usuário alterado',
  affectedUserEmail: 'E-mail do usuário alterado',
  progressId: 'Progresso',
  progressDate: 'Data do progresso',
  progressAt: 'Data do progresso',
  projectTitle: 'Projeto',
  projectName: 'Projeto',
  installationProjectId: 'Projeto',
  vehicleId: 'Veículo',
  vehicles: 'Veículos',
  Vehicles: 'Veículos',
  progressVehicles: 'Veículos do progresso',
  vehicleProgress: 'Veículos do progresso',
  createdVehicles: 'Veículos criados',
  updatedVehicles: 'Veículos atualizados',
  plate: 'Placa',
  placa: 'Placa',
  serial: 'Serial',
  serialNumber: 'Serial',
  equipmentSerial: 'Serial do equipamento',
  notes: 'Observações',
  message: 'Mensagem',
};

function getActionLabel(action?: string) {
  const key = String(action || '').toUpperCase();
  return ACTION_LABELS[key] || key || '-';
}

function getStatusColor(status?: number) {
  if (!status) return 'default';
  if (status >= 200 && status < 300) return 'green';
  if (status >= 400 && status < 500) return 'orange';
  if (status >= 500) return 'red';
  return 'blue';
}

function getBody(log?: ActivityLog | null) {
  return log?.request?.body || log?.request?.data || log?.after || {};
}

function getParams(log?: ActivityLog | null) {
  return log?.request?.params || {};
}

function getResponse(log?: ActivityLog | null) {
  return log?.response || {};
}

function getAction(log?: ActivityLog | null) {
  return String(log?.action || '').toUpperCase();
}

function getRoleNameById(roleId: any) {
  const id = Number(roleId);

  const roles: Record<number, string> = {
    1: 'Técnico',
    2: 'Analista',
    3: 'Supervisor',
    4: 'Coordenador',
    5: 'Gerente',
    6: 'Diretor',
    7: 'Admin',
    8: 'PSO',
    9: 'SPOT',
    10: 'PRP',
  };

  return roles[id];
}

function onlyFilled(fields: [string, any][]) {
  return fields.filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '';
  });
}

function labelizeKey(key: string) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];

  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (s) => s.toUpperCase());
}

function formatObjectSummary(value: any) {
  if (!value || typeof value !== 'object') return String(value ?? '-');

  const label =
    value.plate ||
    value.placa ||
    value.vehiclePlate ||
    value.serial ||
    value.serialNumber ||
    value.equipmentSerial ||
    value.chassi ||
    value.name ||
    value.nome ||
    value.title ||
    value.id;

  const parts = [
    value.plate || value.placa || value.vehiclePlate ? `Placa: ${value.plate || value.placa || value.vehiclePlate}` : undefined,
    value.serial || value.serialNumber || value.equipmentSerial ? `Serial: ${value.serial || value.serialNumber || value.equipmentSerial}` : undefined,
    value.model || value.modelo ? `Modelo: ${value.model || value.modelo}` : undefined,
    value.status ? `Status: ${value.status}` : undefined,
    value.result || value.resultado ? `Resultado: ${value.result || value.resultado}` : undefined,
  ].filter(Boolean);

  if (parts.length) return parts.join(' | ');
  if (label) return String(label);

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatValue(value: any) {
  if (React.isValidElement(value)) return value;

  if (Array.isArray(value)) {
    if (!value.length) return '-';

    const hasObjects = value.some((item) => item && typeof item === 'object');

    if (hasObjects) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {value.map((item, index) => (
            <div key={index}>
              <Text strong>{index + 1}.</Text> {formatObjectSummary(item)}
            </div>
          ))}
        </div>
      );
    }

    return value.join(', ');
  }

  if (value === true) return 'Sim';
  if (value === false) return 'Não';
  if (value === null || value === undefined || value === '') return '-';

  if (typeof value === 'object') {
    if (value.name) return value.name;
    if (value.nome) return value.nome;
    return formatObjectSummary(value);
  }

  return String(value);
}

function createUserMaps(users: UserLite[]) {
  const userMap: Record<number, string> = {};
  const userEmailMap: Record<number, string> = {};
  const roleMap: Record<number, string> = {};

  users.forEach((u) => {
    if (u.id && u.name) userMap[Number(u.id)] = u.name;
    if (u.id && u.email) userEmailMap[Number(u.id)] = u.email;

    if (u.role?.id && u.role?.name) {
      roleMap[Number(u.role.id)] = u.role.name;
    }
  });

  return { userMap, userEmailMap, roleMap };
}

function getUserName(userMap: Record<number, string>, id: any) {
  const n = Number(id);
  if (!n) return undefined;
  return userMap[n];
}

function getRoleName(roleMap: Record<number, string>, roleId: any) {
  const n = Number(roleId);
  if (!n) return undefined;
  return roleMap[n] || getRoleNameById(n);
}

function normalizeBodyValue(
  key: string,
  value: any,
  userMap: Record<number, string>,
  roleMap: Record<number, string>
) {
  if (key === 'roleId') return getRoleName(roleMap, value) || 'Não localizado';
  if (key === 'managerId') return getUserName(userMap, value) || 'Gestor não localizado';
  if (key === 'responsavelId') return getUserName(userMap, value) || 'Responsável não localizado';
  if (key === 'userId') return getUserName(userMap, value) || 'Usuário não localizado';
  if (['targetUserId', 'changedUserId', 'affectedUserId'].includes(key)) return getUserName(userMap, value) || `Usuário #${value}`;
  if (['projectId', 'installationProjectId'].includes(key)) return `Projeto #${value}`;
  if (key === 'progressId') return `Progresso #${value}`;

  if (key === 'sex') {
    if (value === 'M') return 'Masculino';
    if (value === 'F') return 'Feminino';
    if (value === 'O') return 'Outro';
    return value;
  }

  if (
    [
      'date',
      'dataEntrega',
      'entregaPrevista',
      'saleDate',
      'startPlannedAt',
      'endPlannedAt',
    ].includes(key) &&
    typeof value === 'string'
  ) {
    return dayjs(value).isValid() ? dayjs(value).format('DD/MM/YYYY') : value;
  }

  if (key === 'reportType' || key === 'automaticReportType') {
    if (value === 'complete') return 'Completo';
    if (value === 'simple') return 'Simples';
    return value;
  }

  return value;
}

function bodyToFields(
  body: any,
  userMap: Record<number, string>,
  roleMap: Record<number, string>,
  ignoreKeys: string[] = []
) {
  if (!body || typeof body !== 'object') return [];

  return Object.entries(body)
    .filter(([key, value]) => {
      if (ignoreKeys.includes(key)) return false;
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
    .map(([key, value]) => {
      return [
        labelizeKey(key),
        normalizeBodyValue(key, value, userMap, roleMap),
      ] as [string, any];
    });
}

function isPrestadorCriado(log?: ActivityLog | null) {
  const action = getAction(log);
  const path = String(log?.path || log?.route || '').toLowerCase();
  const description = String(log?.description || '').toLowerCase();

  return (
    action === 'WORKER_CRIADO' ||
    action === 'WORKER_CREATED' ||
    path.includes('/api/users/workers') ||
    description.includes('cadastrou técnico') ||
    description.includes('cadastrou tecnico') ||
    description.includes('prestador criado')
  );
}

const isUsuarioAtualizado = (log?: ActivityLog | null) => getAction(log) === 'USUARIO_ATUALIZADO';
const isPedidoExcluido = (log?: ActivityLog | null) => getAction(log) === 'PEDIDO_EXCLUIDO';
const isPedidoInternoCriado = (log?: ActivityLog | null) => getAction(log) === 'PEDIDO_INTERNO_CRIADO';
const isItemCriado = (log?: ActivityLog | null) => getAction(log) === 'ITEM_CRIADO';
const isItemExcluido = (log?: ActivityLog | null) => getAction(log) === 'ITEM_EXCLUIDO';
const isEmailDiario = (log?: ActivityLog | null) => getAction(log) === 'EMAIL_DIARIO_ENVIADO';
const isEmailInicial = (log?: ActivityLog | null) => getAction(log) === 'EMAIL_INICIAL_ENVIADO';
const isEmailFinal = (log?: ActivityLog | null) => getAction(log) === 'EMAIL_FINAL_ENVIADO';
const isDemandaCriada = (log?: ActivityLog | null) => getAction(log) === 'DEMANDA_CRIADA';
const isDemandaAtualizada = (log?: ActivityLog | null) => getAction(log) === 'DEMANDA_ATUALIZADA';
const isDemandaExcluida = (log?: ActivityLog | null) => getAction(log) === 'DEMANDA_EXCLUIDA';
const isStatusAlterado = (log?: ActivityLog | null) => getAction(log) === 'STATUS_ALTERADO';
const isEstruturaVisualizada = (log?: ActivityLog | null) => getAction(log) === 'ESTRUTURA_VISUALIZADA';
const isLogoRelatorioEnviada = (log?: ActivityLog | null) => getAction(log) === 'LOGO_RELATORIO_DIARIO_ENVIADA';
const isLogoRelatorioExcluida = (log?: ActivityLog | null) => getAction(log) === 'LOGO_RELATORIO_DIARIO_EXCLUIDA';
const isConfigRelatorio = (log?: ActivityLog | null) => getAction(log) === 'CONFIG_RELATORIO_DIARIO_ATUALIZADA';
const isProjetoAtualizado = (log?: ActivityLog | null) => getAction(log) === 'PROJETO_ATUALIZADO';
const isProjetoExcluido = (log?: ActivityLog | null) => getAction(log) === 'PROJETO_EXCLUIDO';
const isProgressoCriado = (log?: ActivityLog | null) => getAction(log) === 'PROGRESSO_CRIADO';
const isProgressoExcluido = (log?: ActivityLog | null) => getAction(log) === 'PROGRESSO_EXCLUIDO';
const isSenhaUsuarioAlterada = (log?: ActivityLog | null) => ['SENHA_USUARIO_ALTERADA', 'SENHA_ALTERADA'].includes(getAction(log));

function getFriendlyAction(log?: ActivityLog | null) {
  if (isPrestadorCriado(log)) return 'Prestador criado';
  return getActionLabel(log?.action);
}

function getActionTag(log: ActivityLog) {
  if (isPrestadorCriado(log)) return <Tag color="blue" icon={<UserAddOutlined />}>Prestador criado</Tag>;
  if (isUsuarioAtualizado(log)) return <Tag color="purple" icon={<UserOutlined />}>Usuário atualizado</Tag>;
  if (isPedidoExcluido(log)) return <Tag color="red" icon={<DeleteOutlined />}>Pedido excluído</Tag>;
  if (isPedidoInternoCriado(log)) return <Tag color="blue" icon={<ShoppingCartOutlined />}>Pedido interno</Tag>;
  if (isItemCriado(log)) return <Tag color="green" icon={<PlusOutlined />}>Item criado</Tag>;
  if (isItemExcluido(log)) return <Tag color="red" icon={<DeleteOutlined />}>Item excluído</Tag>;
  if (isEmailDiario(log)) return <Tag color="cyan" icon={<MailOutlined />}>E-mail diário</Tag>;
  if (isEmailInicial(log)) return <Tag color="geekblue" icon={<MailOutlined />}>E-mail inicial</Tag>;
  if (isEmailFinal(log)) return <Tag color="volcano" icon={<MailOutlined />}>E-mail final</Tag>;
  if (isDemandaCriada(log)) return <Tag color="green" icon={<FileAddOutlined />}>Demanda criada</Tag>;
  if (isDemandaAtualizada(log)) return <Tag color="gold" icon={<EditOutlined />}>Demanda atualizada</Tag>;
  if (isDemandaExcluida(log)) return <Tag color="red" icon={<DeleteOutlined />}>Demanda excluída</Tag>;
  if (isStatusAlterado(log)) return <Tag color="orange" icon={<CheckCircleOutlined />}>Status alterado</Tag>;
  if (isEstruturaVisualizada(log)) return <Tag color="geekblue" icon={<ApartmentOutlined />}>Estrutura visualizada</Tag>;
  if (isLogoRelatorioEnviada(log)) return <Tag color="cyan" icon={<FileImageOutlined />}>Logo enviada</Tag>;
  if (isLogoRelatorioExcluida(log)) return <Tag color="volcano" icon={<DeleteOutlined />}>Logo excluída</Tag>;
  if (isConfigRelatorio(log)) return <Tag color="processing" icon={<SettingOutlined />}>Config. relatório</Tag>;
  if (isProjetoAtualizado(log)) return <Tag color="blue" icon={<ProjectOutlined />}>Projeto atualizado</Tag>;
  if (isProjetoExcluido(log)) return <Tag color="red" icon={<DeleteOutlined />}>Projeto excluído</Tag>;
  if (isProgressoCriado(log)) return <Tag color="green" icon={<PlusOutlined />}>Progresso criado</Tag>;
  if (isProgressoExcluido(log)) return <Tag color="red" icon={<DeleteOutlined />}>Progresso excluído</Tag>;
  if (isSenhaUsuarioAlterada(log)) return <Tag color="purple" icon={<UserOutlined />}>Senha alterada</Tag>;

  return <Tag>{getActionLabel(log.action)}</Tag>;
}

function getPrestadorFields(
  log: ActivityLog | null,
  userMap: Record<number, string>,
  roleMap: Record<number, string>
) {
  const body = getBody(log);

  return onlyFilled([
    ['Nome', body.nome || body.name || body.fullName || body.nomeCompleto],
    [
      'Cargo / Perfil',
      body.cargoDescritivo ||
        body.role?.name ||
        body.roleName ||
        getRoleName(roleMap, body.roleId),
    ],
    [
      'Gestor responsável',
      body.manager?.name ||
        body.managerName ||
        body.gestor ||
        getUserName(userMap, body.managerId),
    ],
    ['Setores', body.sectors || body.setores],
    ['Latitude', body.lat ?? body.latitude],
    ['Longitude', body.lng ?? body.longitude],
  ]);
}

function getUsuarioAtualizadoFields(
  log: ActivityLog | null,
  userMap: Record<number, string>,
  roleMap: Record<number, string>
) {
  const body = getBody(log);

  return onlyFilled([
    ['Colaborador editado', body.name || body.nome || body.nomeCompleto || getUserName(userMap, log?.entityId)],
    ['E-mail', body.email],
    ['Telefone', body.phone || body.telefone || body.celular],
    ['Sexo', normalizeBodyValue('sex', body.sex, userMap, roleMap)],
    [
      'Cargo / Perfil',
      body.cargoDescritivo ||
        body.role?.name ||
        body.roleName ||
        getRoleName(roleMap, body.roleId),
    ],
    [
      'Gestor responsável',
      body.managerName ||
        body.manager?.name ||
        body.gestor ||
        getUserName(userMap, body.managerId),
    ],
    ['Setores', body.sectors || body.setores],
    ['Ativo', body.isActive],
    ['Ocultar cargo', body.ocultarCargo],
    ['Estoque avançado', body.estoqueAvancado],
    ['Código do prestador', body.vendorCode],
    ['Código área de serviço', body.serviceAreaCode],
    ['Nome área de serviço', body.serviceAreaName],
    ['Tipo atendimento', body.tipoAtendimento],
    ['Permissões', body.permissions],
  ]);
}

function getEmailFields(log?: ActivityLog | null) {
  const body = getBody(log);
  const params = getParams(log);

  return onlyFilled([
    ['Projeto', params.id ? `#${params.id}` : undefined],
    ['Data', body.date ? dayjs(body.date).format('DD/MM/YYYY') : undefined],
    ['E-mails enviados', body.emailTo],
    ['Enviar para todos', body.sendAll],
    [
      'Tipo de relatório',
      body.reportType === 'complete'
        ? 'Completo'
        : body.reportType === 'simple'
          ? 'Simples'
          : body.reportType,
    ],
  ]);
}

function getDemandaFields(
  log: ActivityLog | null,
  userMap: Record<number, string>,
  roleMap: Record<number, string>
) {
  const body = getBody(log);

  return onlyFilled([
    ['Nome', body.nome || body.name],
    ['Tipo', body.tipo],
    ['Status', body.status],
    ['Urgência', body.urgencia],
    ['Descrição', body.descricao],
    ['Workspace', body.workspace],
    ['Plataforma', body.plataforma],
    ['Data de entrega', body.dataEntrega ? dayjs(body.dataEntrega).format('DD/MM/YYYY') : undefined],
    ['Entrega prevista', body.entregaPrevista ? dayjs(body.entregaPrevista).format('DD/MM/YYYY') : undefined],
    ['Solicitante', body.solicitante],
    [
      'Responsável',
      body.responsavel?.name ||
        body.responsavelNome ||
        getUserName(userMap, body.responsavelId),
    ],
    ['Periodicidade', body.periodicidade],
    ['Observações', body.observacoes],
    ...bodyToFields(
      body,
      userMap,
      roleMap,
      [
        'nome',
        'name',
        'tipo',
        'status',
        'urgencia',
        'descricao',
        'workspace',
        'plataforma',
        'dataEntrega',
        'entregaPrevista',
        'solicitante',
        'responsavel',
        'responsavelNome',
        'responsavelId',
        'periodicidade',
        'observacoes',
      ],
    ),
  ]);
}

function getProjetoAtualizadoFields(
  log: ActivityLog | null,
  userMap: Record<number, string>,
  roleMap: Record<number, string>
) {
  const body = getBody(log);
  const params = getParams(log);

  return onlyFilled([
    ['Projeto', body.title || body.name || body.nome || (params.id ? `#${params.id}` : undefined)],
    ['Cliente', body.clientName || body.customerName],
    ['AF', body.af],
    ['Status', body.status],
    ['Data de venda', body.saleDate ? dayjs(body.saleDate).format('DD/MM/YYYY') : undefined],
    ['Início planejado', body.startPlannedAt ? dayjs(body.startPlannedAt).format('DD/MM/YYYY') : undefined],
    ['Fim planejado', body.endPlannedAt ? dayjs(body.endPlannedAt).format('DD/MM/YYYY') : undefined],
    ['Supervisor', getUserName(userMap, body.supervisorId)],
    ['Coordenador', getUserName(userMap, body.coordinatorId)],
    ['Técnico', getUserName(userMap, body.technicianId)],
    ['E-mails de contato', body.contactEmails || body.contactEmail],
    ['Veículos totais', body.trucksTotal],
    ['Veículos realizados', body.trucksDone],
    ['Equipamentos totais', body.equipmentsTotal],
    ['Equipamentos por dia', body.equipmentsPerDay],
    ...bodyToFields(
      body,
      userMap,
      roleMap,
      [
        'title',
        'name',
        'nome',
        'clientName',
        'customerName',
        'af',
        'status',
        'saleDate',
        'startPlannedAt',
        'endPlannedAt',
        'supervisorId',
        'coordinatorId',
        'technicianId',
        'contactEmails',
        'contactEmail',
        'trucksTotal',
        'trucksDone',
        'equipmentsTotal',
        'equipmentsPerDay',
      ],
    ),
  ]);
}


function pushUniqueField(fields: [string, any][], label: string, value: any) {
  if (value === undefined || value === null || value === '') return;
  if (Array.isArray(value) && value.length === 0) return;
  if (fields.some(([existingLabel]) => existingLabel === label)) return;
  fields.push([label, value]);
}

function appendPayloadFields(
  fields: [string, any][],
  payload: any,
  userMap: Record<number, string>,
  roleMap: Record<number, string>,
  prefix = '',
  ignoreKeys: string[] = []
) {
  bodyToFields(payload, userMap, roleMap, ignoreKeys).forEach(([label, value]) => {
    pushUniqueField(fields, prefix ? `${prefix} - ${label}` : label, value);
  });
}

function getProjectNameFromAny(log: ActivityLog | null) {
  const body = getBody(log);
  const params = getParams(log);
  const response = getResponse(log);
  const before = log?.before || {};
  const after = log?.after || {};

  return (
    body.projectTitle ||
    body.projectName ||
    body.title ||
    body.nome ||
    body.name ||
    response.projectTitle ||
    response.projectName ||
    response.title ||
    response.nome ||
    response.name ||
    response.project?.title ||
    response.project?.name ||
    response.data?.title ||
    response.data?.name ||
    before.title ||
    before.name ||
    after.title ||
    after.name ||
    (params.id ? `Projeto #${params.id}` : undefined) ||
    (log?.entityId ? `Projeto #${log.entityId}` : undefined)
  );
}

function getProjetoExcluidoFields(
  log: ActivityLog | null,
  userMap: Record<number, string>,
  roleMap: Record<number, string>
) {
  const body = getBody(log);
  const params = getParams(log);
  const response = getResponse(log);
  const before = log?.before || {};
  const status = log?.statusCode || log?.status;
  const fields: [string, any][] = [];

  pushUniqueField(fields, 'Projeto excluído', getProjectNameFromAny(log));
  pushUniqueField(fields, 'ID do projeto', params.id || body.id || before.id || log?.entityId);
  pushUniqueField(fields, 'AF', body.af || before.af || response.af || response.project?.af);
  pushUniqueField(fields, 'Cliente', body.clientName || body.customerName || before.clientName || before.customerName || response.clientName || response.project?.clientName);
  pushUniqueField(fields, 'Status anterior', before.status || body.status || response.project?.status);
  pushUniqueField(fields, 'Resultado', response?.message || (status && status >= 200 && status < 300 ? 'Projeto excluído com sucesso' : undefined));
  pushUniqueField(fields, 'Descrição', log?.description);

  appendPayloadFields(fields, before, userMap, roleMap, 'Antes', ['id', 'title', 'name', 'af', 'clientName', 'customerName', 'status']);
  appendPayloadFields(fields, body, userMap, roleMap, 'Requisição', ['id', 'title', 'name', 'nome', 'af', 'clientName', 'customerName', 'status']);
  appendPayloadFields(fields, response, userMap, roleMap, 'Resposta', ['message', 'af', 'clientName']);

  return fields;
}


function getProgressVehiclesFromAny(...sources: any[]) {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;

    const vehicles =
      source.vehicles ||
      source.Vehicles ||
      source.progressVehicles ||
      source.vehicleProgress ||
      source.createdVehicles ||
      source.updatedVehicles ||
      source.items ||
      source.data?.vehicles ||
      source.data?.Vehicles ||
      source.data?.progressVehicles;

    if (Array.isArray(vehicles) && vehicles.length) return vehicles;
  }

  return [];
}

function getProgressVehicleSummary(vehicles: any[]) {
  if (!vehicles.length) return undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Text strong>{vehicles.length} veículo(s) vinculado(s) a este progresso</Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {vehicles.map((vehicle, index) => (
          <div key={vehicle?.id || vehicle?.vehicleId || index}>
            <Text strong>{index + 1}.</Text> {formatObjectSummary(vehicle)}
          </div>
        ))}
      </div>
    </div>
  );
}

function getProgressFields(
  log: ActivityLog | null,
  userMap: Record<number, string>,
  roleMap: Record<number, string>
) {
  const body = getBody(log);
  const params = getParams(log);
  const response = getResponse(log);
  const before = log?.before || {};
  const after = log?.after || {};
  const status = log?.statusCode || log?.status;
  const source = Object.keys(after).length ? after : Object.keys(before).length ? before : body;
  const fields: [string, any][] = [];

  pushUniqueField(fields, isProgressoExcluido(log) ? 'Progresso excluído' : 'Progresso criado', source.id || body.progressId || response.progressId || response.id || log?.entityId);
  pushUniqueField(fields, 'Projeto', source.projectTitle || source.projectName || body.projectTitle || body.projectName || response.projectTitle || response.projectName || (source.projectId || body.projectId || params.projectId || params.id ? `Projeto #${source.projectId || body.projectId || params.projectId || params.id}` : undefined));
  pushUniqueField(fields, 'Data do progresso', source.date || source.progressDate || source.progressAt || body.date || body.progressDate);
  pushUniqueField(fields, 'Veículos realizados', source.trucksDone ?? body.trucksDone ?? response.trucksDone);
  pushUniqueField(fields, 'Equipamentos realizados', source.equipmentsDone ?? body.equipmentsDone ?? response.equipmentsDone);
  pushUniqueField(fields, 'Percentual', source.percentual ?? source.percentage ?? body.percentual ?? body.percentage);
  pushUniqueField(fields, 'Observações', source.notes || source.observacoes || body.notes || body.observacoes);

  const vehicles = getProgressVehiclesFromAny(source, body, response, before, after);
  pushUniqueField(fields, 'Veículos do progresso', getProgressVehicleSummary(vehicles));

  pushUniqueField(fields, 'Resultado', response?.message || (status && status >= 200 && status < 300 ? (isProgressoExcluido(log) ? 'Progresso excluído com sucesso' : 'Progresso criado com sucesso') : undefined));

  const progressIgnoreKeys = [
    'id',
    'progressId',
    'projectId',
    'installationProjectId',
    'projectTitle',
    'projectName',
    'date',
    'progressDate',
    'progressAt',
    'trucksDone',
    'equipmentsDone',
    'percentual',
    'percentage',
    'notes',
    'observacoes',
    'vehicles',
    'Vehicles',
    'progressVehicles',
    'vehicleProgress',
    'createdVehicles',
    'updatedVehicles',
    'items',
  ];

  appendPayloadFields(fields, before, userMap, roleMap, 'Antes', progressIgnoreKeys);
  appendPayloadFields(fields, body, userMap, roleMap, 'Requisição', progressIgnoreKeys);
  appendPayloadFields(fields, after, userMap, roleMap, 'Depois', progressIgnoreKeys);
  appendPayloadFields(fields, response, userMap, roleMap, 'Resposta', ['message', ...progressIgnoreKeys]);

  return fields;
}

function getSenhaUsuarioAlteradaFields(
  log: ActivityLog | null,
  userMap: Record<number, string>,
  roleMap: Record<number, string>
) {
  const body = getBody(log);
  const params = getParams(log);
  const response = getResponse(log);
  const after = log?.after || {};
  const targetId =
    body.targetUserId ||
    body.changedUserId ||
    body.affectedUserId ||
    body.userId ||
    params.userId ||
    params.id ||
    response.targetUserId ||
    response.userId ||
    after.id ||
    log?.entityId;

  const targetName =
    body.targetUserName ||
    body.changedUserName ||
    body.affectedUserName ||
    body.userName ||
    body.name ||
    body.nome ||
    response.targetUserName ||
    response.userName ||
    response.name ||
    response.user?.name ||
    after.name ||
    after.nome ||
    getUserName(userMap, targetId);

  const targetEmail =
    body.targetUserEmail ||
    body.changedUserEmail ||
    body.affectedUserEmail ||
    body.userEmail ||
    body.email ||
    response.targetUserEmail ||
    response.userEmail ||
    response.email ||
    response.user?.email ||
    after.email;

  const fields: [string, any][] = [];

  pushUniqueField(fields, 'Usuário que teve a senha alterada', targetName || (targetId ? `Usuário #${targetId}` : undefined));
  pushUniqueField(fields, 'ID do usuário alterado', targetId);
  pushUniqueField(fields, 'E-mail do usuário alterado', targetEmail);
  pushUniqueField(fields, 'Resultado', response?.message || 'Senha alterada com sucesso');
  pushUniqueField(fields, 'Descrição', log?.description);

  appendPayloadFields(fields, body, userMap, roleMap, 'Requisição', ['password', 'senha', 'newPassword', 'confirmPassword', 'targetUserId', 'changedUserId', 'affectedUserId', 'userId', 'targetUserName', 'changedUserName', 'affectedUserName', 'userName', 'name', 'nome', 'targetUserEmail', 'changedUserEmail', 'affectedUserEmail', 'userEmail', 'email']);
  appendPayloadFields(fields, response, userMap, roleMap, 'Resposta', ['message', 'targetUserId', 'userId', 'targetUserName', 'userName', 'name', 'email']);

  return fields;
}

function getStatusAlteradoFields(
  log: ActivityLog | null,
  userMap: Record<number, string>,
  roleMap: Record<number, string>
) {
  const body = getBody(log);
  const params = getParams(log);

  return onlyFilled([
    ['Registro alterado', params.id ? `#${params.id}` : undefined],
    ['Status alterado para', body.status || body.newStatus || body.statusTo],
    ['Status anterior', body.oldStatus || body.statusFrom],
    ['Responsável', getUserName(userMap, body.userId || body.responsavelId)],
    ['Motivo', body.reason || body.motivo],
    ['Observação', body.note || body.observacao || body.observacoes],
    ...bodyToFields(
      body,
      userMap,
      roleMap,
      ['status', 'newStatus', 'statusTo', 'oldStatus', 'statusFrom', 'userId', 'responsavelId', 'reason', 'motivo', 'note', 'observacao', 'observacoes'],
    ),
  ]);
}

function getGenericCreatedFields(
  log: ActivityLog | null,
  userMap: Record<number, string>,
  roleMap: Record<number, string>
) {
  const body = getBody(log);
  const params = getParams(log);

  return onlyFilled([
    ['Registro relacionado', params.id ? `#${params.id}` : undefined],
    ['Colaborador', getUserName(userMap, body.userId || body.collaboratorId)],
    ...bodyToFields(body, userMap, roleMap),
  ]);
}

function getLogoRelatorioFields(
  log: ActivityLog | null,
  userMap: Record<number, string>,
  roleMap: Record<number, string>
) {
  const body = getBody(log);
  const params = getParams(log);

  return onlyFilled([
    ['Projeto', params.id ? `#${params.id}` : undefined],
    ['Arquivo', body.filename || body.fileName || body.name],
    [
      'URL da logo',
      body.logoUrl ||
        body.url ||
        body.dailyReportClientLogoUrl ||
        body.dailyReportOmnilinkLogoUrl,
    ],
    ['Tipo de logo', body.logoType || body.type],
    ...bodyToFields(
      body,
      userMap,
      roleMap,
      ['filename', 'fileName', 'name', 'logoUrl', 'url', 'dailyReportClientLogoUrl', 'dailyReportOmnilinkLogoUrl', 'logoType', 'type'],
    ),
  ]);
}

function getDemandaExcluidaFields(
  log: ActivityLog | null,
  userMap: Record<number, string>,
  roleMap: Record<number, string>
) {
  const body = getBody(log);
  const params = getParams(log);

  return onlyFilled([
    ['Demanda excluída', body.nome || body.name || body.title || (params.id ? `#${params.id}` : undefined)],
    ['Motivo', body.reason || body.motivo],
    ['Exclusão lógica', 'Sim'],
    ...bodyToFields(body, userMap, roleMap, ['nome', 'name', 'title', 'reason', 'motivo']),
  ]);
}

function getEstruturaVisualizadaFields(
  log: ActivityLog | null,
  userMap: Record<number, string>,
  userEmailMap: Record<number, string>,
  roleMap: Record<number, string>
) {
  const body = getBody(log);
  const params = getParams(log);

  const collaboratorId =
    params.id ||
    body.userId ||
    body.collaboratorId ||
    body.id ||
    log?.entityId;

  const collaboratorName =
    body.name ||
    body.nome ||
    body.userName ||
    body.collaboratorName ||
    getUserName(userMap, collaboratorId);

  return onlyFilled([
    ['Colaborador visualizado', collaboratorName || 'Colaborador não localizado'],
    [
      'E-mail do colaborador',
      body.email ||
        body.userEmail ||
        body.collaboratorEmail ||
        userEmailMap[Number(collaboratorId)],
    ],
    ['Tipo de visualização', 'Estrutura hierárquica'],
    ...bodyToFields(
      body,
      userMap,
      roleMap,
      ['name', 'nome', 'email', 'userName', 'userEmail', 'collaboratorName', 'collaboratorEmail', 'userId', 'collaboratorId', 'id'],
    ),
  ]);
}

function getPedidoExcluidoFields(log?: ActivityLog | null) {
  const body = getBody(log);
  const params = getParams(log);
  const response = getResponse(log);
  const status = log?.statusCode || log?.status;

  const pedido =
    body.title ||
    body.nome ||
    body.name ||
    body.numero ||
    body.codigo ||
    body.requestNumber ||
    body.partRequestNumber ||
    (params.id ? `Pedido de peças #${params.id}` : undefined);

  return onlyFilled([
    ['Pedido excluído', pedido],
    ['Resultado', response?.message || (status && status >= 200 && status < 300 ? 'Pedido excluído com sucesso' : undefined)],
  ]);
}

function getLogInfoFields(log?: ActivityLog | null) {
  if (!log) return [];

  return onlyFilled([
    ['Data', log.createdAt ? dayjs(log.createdAt).format('DD/MM/YYYY HH:mm:ss') : undefined],
    ['Usuário executor', log.user?.name || log.userName || 'Sistema'],
    ['E-mail executor', log.user?.email || log.userEmail],
    ['Ação', getFriendlyAction(log)],
    ['Módulo', log.module],
    ['Método', log.method],
    ['Status', log.statusCode || log.status],
    ['Descrição', log.description],
  ]);
}

function SimpleFields({ fields }: { fields: [string, any][] }) {
  if (!fields.length) {
    return <Empty description="Nenhuma informação encontrada neste log" />;
  }

  return (
    <Descriptions bordered size="small" column={1}>
      {fields.map(([label, value]) => (
        <Descriptions.Item key={label} label={label}>
          {label === 'Status' ? (
            <Tag color={getStatusColor(Number(value))}>{formatValue(value)}</Tag>
          ) : (
            formatValue(value)
          )}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
}

function getDetailTitle(log?: ActivityLog | null) {
  if (isPrestadorCriado(log)) return 'Prestador criado';
  if (isUsuarioAtualizado(log)) return 'Usuário atualizado';
  if (isPedidoExcluido(log)) return 'Pedido excluído';
  if (isPedidoInternoCriado(log)) return 'Pedido interno criado';
  if (isItemCriado(log)) return 'Item criado';
  if (isItemExcluido(log)) return 'Item excluído';
  if (isEmailDiario(log)) return 'E-mail diário enviado';
  if (isEmailInicial(log)) return 'E-mail inicial enviado';
  if (isEmailFinal(log)) return 'E-mail final enviado';
  if (isDemandaCriada(log)) return 'Demanda criada';
  if (isDemandaAtualizada(log)) return 'Demanda atualizada';
  if (isDemandaExcluida(log)) return 'Demanda excluída';
  if (isStatusAlterado(log)) return 'Status alterado';
  if (isEstruturaVisualizada(log)) return 'Estrutura visualizada';
  if (isLogoRelatorioEnviada(log)) return 'Logo do relatório enviada';
  if (isLogoRelatorioExcluida(log)) return 'Logo do relatório excluída';
  if (isConfigRelatorio(log)) return 'Configuração do relatório diário';
  if (isProjetoAtualizado(log)) return 'Projeto atualizado';
  if (isProjetoExcluido(log)) return 'Projeto excluído';
  if (isProgressoCriado(log)) return 'Progresso criado';
  if (isProgressoExcluido(log)) return 'Progresso excluído';
  if (isSenhaUsuarioAlterada(log)) return 'Senha de usuário alterada';
  return 'Detalhes do log';
}

function getMainCardTitle(log?: ActivityLog | null) {
  if (isPrestadorCriado(log)) return 'Dados do prestador cadastrado';
  if (isUsuarioAtualizado(log)) return 'Dados alterados do colaborador';
  if (isPedidoExcluido(log)) return 'Resultado da exclusão';
  if (isPedidoInternoCriado(log)) return 'Dados do pedido interno';
  if (isItemCriado(log)) return 'Dados do item criado';
  if (isItemExcluido(log)) return 'Resultado da exclusão do item';
  if (isEmailDiario(log) || isEmailInicial(log) || isEmailFinal(log)) return 'Dados do envio';
  if (isDemandaCriada(log)) return 'Dados da demanda criada';
  if (isDemandaAtualizada(log)) return 'Dados atualizados da demanda';
  if (isDemandaExcluida(log)) return 'Dados da demanda excluída';
  if (isStatusAlterado(log)) return 'Alteração realizada';
  if (isEstruturaVisualizada(log)) return 'Colaborador visualizado';
  if (isLogoRelatorioEnviada(log)) return 'Dados da logo enviada';
  if (isLogoRelatorioExcluida(log)) return 'Resultado da exclusão da logo';
  if (isConfigRelatorio(log)) return 'Configurações atualizadas';
  if (isProjetoAtualizado(log)) return 'Dados atualizados do projeto';
  if (isProjetoExcluido(log)) return 'Dados do projeto excluído';
  if (isProgressoCriado(log)) return 'Dados do progresso criado';
  if (isProgressoExcluido(log)) return 'Dados do progresso excluído';
  if (isSenhaUsuarioAlterada(log)) return 'Usuário afetado pela troca de senha';
  return 'Informações registradas';
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [users, setUsers] = useState<UserLite[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [q, setQ] = useState('');
  const [actionFilter, setActionFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().subtract(6, 'day'),
    dayjs(),
  ]);

  const { userMap, userEmailMap, roleMap } = useMemo(() => {
    return createUserMaps(users);
  }, [users]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);

      const { data } = await api.get('/users');

      const rows = Array.isArray(data)
        ? data
        : data?.rows || data?.data || data?.users || [];

      setUsers(rows);
    } catch (error) {
      console.error('Erro ao carregar usuários para mapear nomes', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadLogs = async (
    nextPage = page,
    nextPageSize = pageSize,
    nextAction = actionFilter,
    nextQ = q,
    nextDateRange = dateRange
  ) => {
    try {
      setLoading(true);

      const { data } = await api.get('/activity-logs', {
        params: {
          page: nextPage,
          pageSize: nextPageSize,
          q: nextQ || undefined,
          action: nextAction || undefined,
          dateFrom: nextDateRange?.[0]?.format('YYYY-MM-DD'),
          dateTo: nextDateRange?.[1]?.format('YYYY-MM-DD'),
        },
      });

      const rows = Array.isArray(data)
        ? data
        : data?.rows || data?.data || data?.logs || [];

      setLogs(rows);
      setTotal(data?.count || data?.total || rows.length);
      setPage(data?.page || nextPage);
      setPageSize(data?.pageSize || nextPageSize);

      const usersFromLogs: UserLite[] = rows
        .filter((item: ActivityLog) => item.user?.id || item.userName)
        .map((item: ActivityLog) => ({
          id: Number(item.user?.id || item.userId),
          name: item.user?.name || item.userName || '',
          email: item.user?.email || item.userEmail || '',
        }))
        .filter((item: UserLite) => item.id && item.name);

      if (usersFromLogs.length) {
        setUsers((prev) => {
          const map = new Map<number, UserLite>();
          [...prev, ...usersFromLogs].forEach((u) => map.set(Number(u.id), u));
          return Array.from(map.values());
        });
      }
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          'Erro ao carregar logs'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadLogs(1, 20, undefined, '', dateRange);
  }, []);

  const actionOptions = useMemo(() => {
    const pageActions = logs
      .map((item) => item.action)
      .filter(Boolean)
      .map((action) => ({
        value: action as string,
        label: getActionLabel(action as string),
      }));

    const merged = [...COMMON_ACTION_OPTIONS, ...pageActions];

    return Array.from(new Map(merged.map((item) => [item.value, item])).values()).sort((a, b) =>
      a.label.localeCompare(b.label, 'pt-BR')
    );
  }, [logs]);

  const isRangeOver30Days = (range: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    if (!range) return false;
    return range[1].startOf('day').diff(range[0].startOf('day'), 'day') + 1 > 30;
  };

  const validateDateRange = (range: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    if (!range) {
      message.warning('Selecione um período para consultar os logs.');
      return false;
    }

    if (range[1].isBefore(range[0], 'day')) {
      message.warning('A data final não pode ser menor que a data inicial.');
      return false;
    }

    if (isRangeOver30Days(range)) {
      message.warning('Selecione no máximo 30 dias por vez.');
      return false;
    }

    return true;
  };

  const handleFilter = () => {
    if (!validateDateRange(dateRange)) return;
    loadLogs(1, pageSize, actionFilter, q, dateRange);
  };

  const handleDownloadExcel = async () => {
    if (!validateDateRange(dateRange)) return;

    try {
      setExporting(true);

      const response = await api.get('/activity-logs/export', {
        responseType: 'blob',
        params: {
          q: q || undefined,
          action: actionFilter || undefined,
          dateFrom: dateRange?.[0]?.format('YYYY-MM-DD'),
          dateTo: dateRange?.[1]?.format('YYYY-MM-DD'),
        },
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const inicio = dateRange?.[0]?.format('YYYY-MM-DD');
      const fim = dateRange?.[1]?.format('YYYY-MM-DD');

      link.href = url;
      link.download = `logs_${inicio}_${fim}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success('Excel gerado com sucesso.');
    } catch (error: any) {
      if (error?.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text);
          message.error(parsed?.message || parsed?.error || 'Erro ao gerar Excel');
          return;
        } catch (_) {}
      }

      message.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          'Erro ao gerar Excel'
      );
    } finally {
      setExporting(false);
    }
  };

  const handleClearFilters = () => {
    setQ('');
    setActionFilter(undefined);
    const defaultRange: [dayjs.Dayjs, dayjs.Dayjs] = [dayjs().subtract(6, 'day'), dayjs()];
    setDateRange(defaultRange);
    loadLogs(1, pageSize, undefined, '', [dayjs().subtract(6, 'day'), dayjs()]);
  };

  const openDetails = (log: ActivityLog) => {
    setSelectedLog(log);
    setModalOpen(true);
  };

  const columns: ColumnsType<ActivityLog> = [
    {
      title: 'Data',
      dataIndex: 'createdAt',
      width: 170,
      render: (value) => (value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Usuário',
      dataIndex: 'user',
      width: 260,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.user?.name || record.userName || 'Sistema'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.user?.email || record.userEmail || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Ação',
      dataIndex: 'action',
      width: 250,
      render: (_, record) => getActionTag(record),
    },
    {
      title: 'Descrição',
      dataIndex: 'description',
      render: (value) => value || '-',
    },
    {
      title: 'Status',
      dataIndex: 'statusCode',
      width: 100,
      render: (_, record) => {
        const status = record.statusCode || record.status;
        return <Tag color={getStatusColor(status)}>{status || '-'}</Tag>;
      },
    },
    {
      title: 'Ações',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <Button type="text" icon={<EyeOutlined />} onClick={() => openDetails(record)} />
      ),
    },
  ];

  const renderRightContent = () => {
    if (!selectedLog) return null;

    if (isPedidoExcluido(selectedLog)) {
      const status = selectedLog.statusCode || selectedLog.status;
      const success = !!status && status >= 200 && status < 300;

      return (
        <Card
          size="small"
          title={getMainCardTitle(selectedLog)}
          style={{ borderRadius: 14, height: '100%' }}
        >
          <Alert
            type={success ? 'success' : 'error'}
            showIcon
            message={success ? 'Exclusão realizada' : 'Falha na exclusão'}
            description="Veja abaixo qual pedido foi afetado."
            style={{ marginBottom: 12 }}
          />

          <SimpleFields fields={getPedidoExcluidoFields(selectedLog)} />
        </Card>
      );
    }

    let fields: [string, any][] = [];

    if (isPrestadorCriado(selectedLog)) fields = getPrestadorFields(selectedLog, userMap, roleMap);
    else if (isUsuarioAtualizado(selectedLog)) fields = getUsuarioAtualizadoFields(selectedLog, userMap, roleMap);
    else if (isPedidoInternoCriado(selectedLog)) fields = getGenericCreatedFields(selectedLog, userMap, roleMap);
    else if (isItemCriado(selectedLog)) fields = getGenericCreatedFields(selectedLog, userMap, roleMap);
    else if (isItemExcluido(selectedLog)) fields = getGenericCreatedFields(selectedLog, userMap, roleMap);
    else if (isEmailDiario(selectedLog) || isEmailInicial(selectedLog) || isEmailFinal(selectedLog)) fields = getEmailFields(selectedLog);
    else if (isDemandaCriada(selectedLog)) fields = getDemandaFields(selectedLog, userMap, roleMap);
    else if (isDemandaAtualizada(selectedLog)) fields = getDemandaFields(selectedLog, userMap, roleMap);
    else if (isDemandaExcluida(selectedLog)) fields = getDemandaExcluidaFields(selectedLog, userMap, roleMap);
    else if (isStatusAlterado(selectedLog)) fields = getStatusAlteradoFields(selectedLog, userMap, roleMap);
    else if (isEstruturaVisualizada(selectedLog)) fields = getEstruturaVisualizadaFields(selectedLog, userMap, userEmailMap, roleMap);
    else if (isLogoRelatorioEnviada(selectedLog)) fields = getLogoRelatorioFields(selectedLog, userMap, roleMap);
    else if (isLogoRelatorioExcluida(selectedLog)) fields = getLogoRelatorioFields(selectedLog, userMap, roleMap);
    else if (isConfigRelatorio(selectedLog)) fields = bodyToFields(getBody(selectedLog), userMap, roleMap);
    else if (isProjetoAtualizado(selectedLog)) fields = getProjetoAtualizadoFields(selectedLog, userMap, roleMap);
    else if (isProjetoExcluido(selectedLog)) fields = getProjetoExcluidoFields(selectedLog, userMap, roleMap);
    else if (isProgressoCriado(selectedLog) || isProgressoExcluido(selectedLog)) fields = getProgressFields(selectedLog, userMap, roleMap);
    else if (isSenhaUsuarioAlterada(selectedLog)) fields = getSenhaUsuarioAlteradaFields(selectedLog, userMap, roleMap);
    else {
      fields = onlyFilled([
        ['Mensagem', selectedLog.response?.message],
        ['Descrição', selectedLog.description],
        ['Método', selectedLog.method],
        ['Status', selectedLog.statusCode || selectedLog.status],
      ]);
    }

    return (
      <Card
        size="small"
        title={getMainCardTitle(selectedLog)}
        style={{ borderRadius: 14, height: '100%' }}
      >
        {loadingUsers ? <Spin /> : <SimpleFields fields={fields} />}
      </Card>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ borderRadius: 18, boxShadow: '0 6px 18px rgba(0,0,0,0.06)' }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              Logs de Atividades
            </Title>
            <Text type="secondary">Histórico de ações realizadas no sistema</Text>
          </Col>

          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadUsers();
                loadLogs(page, pageSize, actionFilter, q, dateRange);
              }}
              loading={loading}
            >
              Atualizar
            </Button>
          </Col>
        </Row>

        <Row gutter={[12, 12]} style={{ marginTop: 20 }}>
          <Col xs={24} md={12} lg={10}>
            <Input
              allowClear
              placeholder="Pesquisar por usuário, ação ou descrição"
              prefix={<SearchOutlined />}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onPressEnter={handleFilter}
            />
          </Col>

          <Col xs={24} md={8} lg={5}>
            <Select
              allowClear
              showSearch
              style={{ width: '100%' }}
              placeholder="Filtrar por ação"
              value={actionFilter}
              options={actionOptions}
              optionFilterProp="label"
              onChange={(value) => {
                setActionFilter(value);
                loadLogs(1, pageSize, value, q, dateRange);
              }}
            />
          </Col>

          <Col xs={24} md={12} lg={5}>
            <RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              value={dateRange}
              allowClear={false}
              presets={[
                { label: 'Hoje', value: [dayjs(), dayjs()] },
                { label: 'Últimos 7 dias', value: [dayjs().subtract(6, 'day'), dayjs()] },
                { label: 'Últimos 30 dias', value: [dayjs().subtract(29, 'day'), dayjs()] },
              ]}
              onChange={(value) => {
                const nextRange = value as [dayjs.Dayjs, dayjs.Dayjs] | null;

                if (!validateDateRange(nextRange)) return;

                setDateRange(nextRange);
                loadLogs(1, pageSize, actionFilter, q, nextRange);
              }}
            />
          </Col>

          <Col xs={12} md={4} lg={2}>
            <Button type="primary" onClick={handleFilter} block>
              Filtrar
            </Button>
          </Col>

          <Col xs={12} md={4} lg={2}>
            <Button onClick={handleClearFilters} block>
              Limpar
            </Button>
          </Col>

            <Col xs={24} md={8} lg={5} style={{ marginLeft: 'auto' }}>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadExcel}
                loading={exporting}
                block
              >
                Baixar Excel
              </Button>
            </Col>
        </Row>

        <div style={{ marginTop: 20 }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={logs}
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (totalRegistros, range) =>
                `${range[0]}-${range[1]} de ${totalRegistros} registros`,
              onChange: (nextPage, nextPageSize) => {
                loadLogs(nextPage, nextPageSize, actionFilter, q, dateRange);
              },
            }}
            locale={{
              emptyText: loading ? <Spin /> : <Empty description="Nenhum log encontrado" />,
            }}
            scroll={{ x: 900 }}
          />
        </div>
      </Card>

      <Modal
        open={modalOpen}
        title={getDetailTitle(selectedLog)}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setModalOpen(false)}>
            Fechar
          </Button>,
        ]}
        width={1030}
        destroyOnHidden
      >
        {selectedLog && (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={10}>
              <Card
                size="small"
                title="Informações do log"
                style={{ borderRadius: 14, height: '100%' }}
              >
                <SimpleFields fields={getLogInfoFields(selectedLog)} />
              </Card>
            </Col>

            <Col xs={24} lg={14}>{renderRightContent()}</Col>
          </Row>
        )}
      </Modal>
    </div>
  );
}