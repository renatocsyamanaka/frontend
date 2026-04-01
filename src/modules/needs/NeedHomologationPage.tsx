import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  Grid,
  Input,
  List,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileOutlined,
  LinkOutlined,
  MailOutlined,
  ReloadOutlined,
  StopOutlined,
  UploadOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  'http://localhost:3000/api';

type HomologationStatus =
  | 'NOT_SENT'
  | 'LINK_SENT'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ADJUSTMENT_REQUIRED'
  | 'APPROVED'
  | 'REJECTED';

type InviteStatus =
  | 'PENDING'
  | 'OPENED'
  | 'SUBMITTED'
  | 'EXPIRED'
  | 'CANCELLED';

type DocumentStatus =
  | 'PENDING'
  | 'SENT'
  | 'APPROVED'
  | 'REJECTED';

type RegistrationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ADJUSTMENT_REQUIRED'
  | 'APPROVED'
  | 'REJECTED';

type ReviewedBy = {
  id: number;
  name: string;
};

type NeedRegistrationDocument = {
  id: number;
  registrationId: number;
  documentTypeId: number;
  status: DocumentStatus;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  notes?: string | null;
  createdAt?: string;
  uploadedAt?: string;
  reviewedAt?: string | null;
  reviewedById?: number | null;
  reviewedBy?: ReviewedBy | null;
};

type NeedRegistration = {
  id: number;
  status: RegistrationStatus;
  fullName?: string | null;
  rg?: string | null;
  cpf?: string | null;
  birthDate?: string | null;
  motherName?: string | null;
  address?: string | null;
  district?: string | null;
  company?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
  roleName?: string | null;
  cnpj?: string | null;
  email?: string | null;
  schedulingContactName?: string | null;
  schedulingContactEmail?: string | null;
  schedulingContactPhone?: string | null;
  paymentContactName?: string | null;
  paymentContactEmail?: string | null;
  paymentContactPhone?: string | null;
  witnessName?: string | null;
  witnessCpf?: string | null;
  witnessEmail?: string | null;
  witnessPhone?: string | null;
  bankName?: string | null;
  bankCode?: string | null;
  agency?: string | null;
  agencyDigit?: string | null;
  accountNumber?: string | null;
  accountDigit?: string | null;
  reviewNotes?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
};

type HomologationChecklistItem = {
  documentTypeId: number;
  code: string;
  name: string;
  description?: string | null;
  templateName?: string | null;
  templateUrl?: string | null;
  isRequired: boolean;
  allowMultiple: boolean;
  sentCount: number;
  latestStatus?: DocumentStatus | null;
  latestDocument?: NeedRegistrationDocument | null;
  documents?: NeedRegistrationDocument[];
};

type Invite = {
  id: number;
  technicianName: string;
  technicianEmail?: string | null;
  technicianPhone?: string | null;
  token: string;
  status: InviteStatus;
  expiresAt?: string | null;
  openedAt?: string | null;
  usedAt?: string | null;
  lastSentAt?: string | null;
  publicLink?: string;
};

type NeedSummary = {
  need: {
    id: number;
    requestedName?: string | null;
    requestedLocationText?: string | null;
    providerName?: string | null;
    providerWhatsapp?: string | null;
    homologationStatus?: HomologationStatus | null;
    registration?: NeedRegistration | null;
  };
  requiredChecklist: HomologationChecklistItem[];
  additionalDocuments: NeedRegistrationDocument[];
  internalDocuments: NeedRegistrationDocument[];
  documents: NeedRegistrationDocument[];
  progress: {
    requiredTotal: number;
    requiredSent: number;
    requiredApproved: number;
    missingRequired: number;
    percent: number;
    extraLimit: number;
    extraUsed: number;
    extraRemaining: number;
  };
};

function fmtDate(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('pt-BR');
}

function fmtDateTime(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('pt-BR');
}

function fileSize(size?: number | null) {
  if (!size) return '—';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

function getTag(status?: string | null) {
  const map: Record<string, { color: string; label: string }> = {
    NOT_SENT: { color: 'default', label: 'Não iniciado' },
    LINK_SENT: { color: 'blue', label: 'Link enviado' },
    IN_PROGRESS: { color: 'processing', label: 'Em preenchimento' },
    SUBMITTED: { color: 'cyan', label: 'Enviado' },
    UNDER_REVIEW: { color: 'gold', label: 'Em análise' },
    ADJUSTMENT_REQUIRED: { color: 'orange', label: 'Ajuste solicitado' },
    APPROVED: { color: 'green', label: 'Aprovado' },
    REJECTED: { color: 'red', label: 'Reprovado' },
    PENDING: { color: 'default', label: 'Pendente' },
    OPENED: { color: 'blue', label: 'Aberto' },
    EXPIRED: { color: 'red', label: 'Expirado' },
    CANCELLED: { color: 'red', label: 'Cancelado' },
    SENT: { color: 'blue', label: 'Enviado' },
    DRAFT: { color: 'default', label: 'Rascunho' },
  };

  const info = map[String(status || '')] || {
    color: 'default',
    label: status || '—',
  };

  return (
    <Tag color={info.color} style={{ borderRadius: 999 }}>
      {info.label}
    </Tag>
  );
}

function resolveAssetUrl(url?: string | null) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_URL.replace(/\/api\/?$/, '');
  return `${base}${String(url).startsWith('/') ? '' : '/'}${url}`;
}

function sectionCardStyle() {
  return {
    borderRadius: 22,
    border: '1px solid #e5e7eb',
    boxShadow: '0 8px 28px rgba(15, 23, 42, 0.05)',
  } as React.CSSProperties;
}

function sectionBodyStyle(padding = 18) {
  return { padding };
}

function isImageFile(doc?: NeedRegistrationDocument | null) {
  if (!doc) return false;
  const mime = String(doc.mimeType || '').toLowerCase();
  const name = String(doc.originalName || doc.fileName || '').toLowerCase();
  return mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
}

function isPdfFile(doc?: NeedRegistrationDocument | null) {
  if (!doc) return false;
  const mime = String(doc.mimeType || '').toLowerCase();
  const name = String(doc.originalName || doc.fileName || '').toLowerCase();
  return mime.includes('pdf') || /\.pdf$/i.test(name);
}

export default function NeedHomologationPage() {
  const { id } = useParams();
  const needId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [openInvite, setOpenInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<NeedRegistrationDocument | null>(null);

  const [openInternalUploadModal, setOpenInternalUploadModal] = useState(false);
  const [internalUploadNotes, setInternalUploadNotes] = useState('');
  const [pendingInternalFile, setPendingInternalFile] = useState<File | null>(null);
  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [financeForm] = Form.useForm();
  const [formInvite] = Form.useForm();

  const defaultFinanceEmails = [
    'renato.yamanaka@omnilink.com.br',
    'mateus.sou@gmail.com',
  ];

  const { data: summary, isLoading } = useQuery<NeedSummary>({
    queryKey: ['need-homologation', needId],
    queryFn: async () => (await api.get(`/need-homologation/needs/${needId}`)).data,
    enabled: !!needId,
  });

  const { data: invites = [], isLoading: loadingInvites } = useQuery<Invite[]>({
    queryKey: ['need-homologation-invites', needId],
    queryFn: async () => (await api.get(`/need-homologation/needs/${needId}/invites`)).data,
    enabled: !!needId,
  });

  const createInvite = useMutation({
    mutationFn: async (payload: {
      technicianName: string;
      technicianEmail?: string | null;
      technicianPhone?: string | null;
      expiresInDays?: number;
    }) => (await api.post(`/need-homologation/needs/${needId}/invites`, payload)).data,
    onSuccess: async (data) => {
      message.success('Link gerado com sucesso');
      setInviteLink(data?.publicLink || '');
      await qc.invalidateQueries({ queryKey: ['need-homologation', needId] });
      await qc.invalidateQueries({ queryKey: ['need-homologation-invites', needId] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao gerar link');
    },
  });

  const cancelInvite = useMutation({
    mutationFn: async (inviteId: number) =>
      (await api.patch(`/need-homologation/needs/${needId}/invites/${inviteId}/cancel`)).data,
    onSuccess: async () => {
      message.success('Link cancelado');
      await qc.invalidateQueries({ queryKey: ['need-homologation-invites', needId] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao cancelar link');
    },
  });

  const resendInviteEmail = useMutation({
    mutationFn: async (inviteId: number) =>
      (await api.post(`/need-homologation/invites/${inviteId}/resend-email`)).data,
    onSuccess: async () => {
      message.success('E-mail reenviado com sucesso');
      await qc.invalidateQueries({ queryKey: ['need-homologation-invites', needId] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao reenviar e-mail');
    },
  });

  const reviewDocument = useMutation({
    mutationFn: async ({
      documentId,
      status,
      notes,
    }: {
      documentId: number;
      status: 'APPROVED' | 'REJECTED';
      notes?: string | null;
    }) =>
      (await api.patch(`/need-homologation/documents/${documentId}/review`, { status, notes })).data,
    onSuccess: async () => {
      message.success('Documento revisado');
      await qc.invalidateQueries({ queryKey: ['need-homologation', needId] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao revisar documento');
    },
  });

  const reviewRegistration = useMutation({
    mutationFn: async (payload: {
      status: 'UNDER_REVIEW' | 'ADJUSTMENT_REQUIRED' | 'APPROVED' | 'REJECTED';
      reviewNotes?: string | null;
    }) => (await api.patch(`/need-homologation/needs/${needId}/review`, payload)).data,
    onSuccess: async () => {
      message.success('Homologação atualizada');
      await qc.invalidateQueries({ queryKey: ['need-homologation', needId] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao revisar homologação');
    },
  });

  const uploadTemplate = useMutation({
    mutationFn: async ({ documentTypeId, file }: { documentTypeId: number; file: File }) => {
      const fd = new FormData();
      fd.append('file', file);

      return (
        await api.post(`/need-homologation/document-types/${documentTypeId}/template`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data;
    },
    onSuccess: async () => {
      message.success('Modelo enviado com sucesso');
      await qc.invalidateQueries({ queryKey: ['need-homologation', needId] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao enviar modelo');
    },
  });

  const sendToFinanceMut = useMutation({
    mutationFn: async (payload: {
      to: string[];
      cc?: string[];
      subject: string;
      message: string;
    }) =>
      (
        await api.post(
          `/need-homologation/needs/${needId}/send-finance`,
          payload
        )
      ).data,
    onSuccess: async () => {
      message.success('E-mail enviado ao financeiro com sucesso');
      setFinanceModalOpen(false);
      financeForm.resetFields();
      await qc.invalidateQueries({ queryKey: ['need-homologation', needId] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Erro ao enviar e-mail');
    },
  });

  const uploadInternalDocument = useMutation({
    mutationFn: async ({ file, notes }: { file: File; notes?: string }) => {
      const fd = new FormData();
      fd.append('file', file);
      if (notes) fd.append('notes', notes);

      return (
        await api.post(`/need-homologation/needs/${needId}/internal-documents`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data;
    },
    onMutate: () => {
      message.loading({
        content: 'Enviando documento...',
        key: 'upload-internal-document',
        duration: 0,
      });
    },
    onSuccess: async () => {
      message.success({
        content: 'Documento interno enviado com sucesso',
        key: 'upload-internal-document',
      });
      setOpenInternalUploadModal(false);
      setInternalUploadNotes('');
      setPendingInternalFile(null);
      await qc.refetchQueries({ queryKey: ['need-homologation', needId] });
    },
    onError: (e: any) => {
      message.error({
        content: e?.response?.data?.error || 'Falha ao enviar documento interno',
        key: 'upload-internal-document',
      });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (documentId: number) =>
      (await api.delete(`/need-homologation/documents/${documentId}`)).data,
    onSuccess: async () => {
      message.success('Documento excluído');
      await qc.refetchQueries({ queryKey: ['need-homologation', needId] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao excluir documento');
    },
  });

  const registration = summary?.need?.registration || null;

  const documentsByType = useMemo(() => {
    const grouped = new Map<number, NeedRegistrationDocument[]>();
    const docs = summary?.documents || [];

    docs.forEach((doc) => {
      const current = grouped.get(doc.documentTypeId) || [];
      current.push(doc);
      grouped.set(doc.documentTypeId, current);
    });

    return grouped;
  }, [summary?.documents]);

  const requiredPending = useMemo(() => {
    return (summary?.requiredChecklist || []).filter(
      (item) => item.isRequired && item.latestStatus !== 'APPROVED'
    ).length;
  }, [summary]);

  const missingDataFields = useMemo(() => {
    const fields = [
      { key: 'fullName', label: 'Nome completo', value: registration?.fullName },
      { key: 'email', label: 'E-mail', value: registration?.email },
      { key: 'phone', label: 'Telefone', value: registration?.phone },
      { key: 'rg', label: 'RG', value: registration?.rg },
      { key: 'cpf', label: 'CPF', value: registration?.cpf },
      { key: 'company', label: 'Empresa', value: registration?.company },
      { key: 'cnpj', label: 'CNPJ', value: registration?.cnpj },
      { key: 'birthDate', label: 'Data de nascimento', value: registration?.birthDate },
      { key: 'motherName', label: 'Nome da mãe', value: registration?.motherName },
      { key: 'address', label: 'Endereço', value: registration?.address },
      { key: 'district', label: 'Bairro', value: registration?.district },
      { key: 'city', label: 'Cidade', value: registration?.city },
      { key: 'state', label: 'UF', value: registration?.state },
      { key: 'zipCode', label: 'CEP', value: registration?.zipCode },
      { key: 'bankName', label: 'Banco', value: registration?.bankName },
      { key: 'bankCode', label: 'Código do banco', value: registration?.bankCode },
      { key: 'agency', label: 'Agência', value: registration?.agency },
      { key: 'agencyDigit', label: 'Dígito da agência', value: registration?.agencyDigit },
      { key: 'accountNumber', label: 'Conta', value: registration?.accountNumber },
      { key: 'accountDigit', label: 'Dígito da conta', value: registration?.accountDigit },
    ];

    return fields.filter((f) => !String(f.value || '').trim());
  }, [registration]);

  const totalRequiredFields = 20;
  const filledRequiredFields = totalRequiredFields - missingDataFields.length;

  const dataCompletionPercent = totalRequiredFields
    ? Math.round((filledRequiredFields / totalRequiredFields) * 100)
    : 0;

  const documentsCompletionPercent = summary?.progress?.requiredTotal
    ? Math.round((summary.progress.requiredSent / summary.progress.requiredTotal) * 100)
    : 0;

  const overallProgressPercent = Math.round(
    (dataCompletionPercent + documentsCompletionPercent) / 2
  );

  const canSendToFinance =
    !!registration &&
    summary?.need?.homologationStatus === 'APPROVED' &&
    missingDataFields.length === 0 &&
    Number(summary?.progress?.requiredTotal || 0) > 0 &&
    Number(summary?.progress?.requiredSent || 0) ===
      Number(summary?.progress?.requiredTotal || 0) &&
    overallProgressPercent === 100;

  useEffect(() => {
    if (!financeModalOpen || !registration) return;

    financeForm.setFieldsValue({
      to: defaultFinanceEmails,
      cc: [],
      subject: `Prestador aprovado para criação de código - ${
        registration.fullName ||
        registration.company ||
        summary?.need?.requestedName ||
        'Prestador'
      }`,
      message:
        `Olá,\n\n` +
        `O prestador abaixo foi homologado com sucesso.\n\n` +
        `Nome: ${registration.fullName || '—'}\n` +
        `Empresa: ${registration.company || '—'}\n` +
        `CPF: ${registration.cpf || '—'}\n` +
        `CNPJ: ${registration.cnpj || '—'}\n` +
        `Telefone: ${registration.phone || '—'}\n` +
        `E-mail: ${registration.email || '—'}\n` +
        `Cidade/UF: ${registration.city || '—'} / ${registration.state || '—'}\n\n` +
        `O prestador já se encontra na aba Prestadores Ativos com os dados completos.\n\n` +
        `Favor seguir com a criação do código do prestador no sistema.`,
    });
  }, [financeModalOpen, financeForm, registration, summary?.need?.requestedName]);

  const openInviteModal = () => {
    formInvite.setFieldsValue({
      technicianName: summary?.need?.requestedName || '',
      technicianPhone: summary?.need?.providerWhatsapp || '',
      technicianEmail: '',
      expiresInDays: 15,
    });
    setInviteLink('');
    setOpenInvite(true);
  };

  const sendWhatsApp = (invite?: Invite) => {
    const phoneRaw =
      invite?.technicianPhone || formInvite.getFieldValue('technicianPhone') || '';
    const publicLink = invite?.publicLink || inviteLink;

    const phone = String(phoneRaw).replace(/\D/g, '');

    if (!phone || !publicLink) {
      message.warning('Telefone ou link não encontrado');
      return;
    }

    const text = encodeURIComponent(
      `Olá! Segue seu link exclusivo para cadastro e envio de documentos da homologação:\n\n${publicLink}`
    );

    window.open(`https://wa.me/55${phone}?text=${text}`, '_blank');
  };

  const copyInviteLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      message.success('Link copiado');
    } catch {
      message.error('Não foi possível copiar o link');
    }
  };

  const askNotesAndReview = (
    documentId: number,
    status: 'APPROVED' | 'REJECTED'
  ) => {
    const notes = window.prompt(
      status === 'APPROVED'
        ? 'Observação da aprovação (opcional):'
        : 'Motivo da reprovação (opcional):',
      ''
    );

    reviewDocument.mutate({
      documentId,
      status,
      notes: notes || '',
    });
  };

  const handleReviewRegistration = (
    status: 'UNDER_REVIEW' | 'ADJUSTMENT_REQUIRED' | 'APPROVED' | 'REJECTED'
  ) => {
    reviewRegistration.mutate({
      status,
      reviewNotes,
    });
  };

  const handlePreviewDocument = (doc: NeedRegistrationDocument) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  const handleDownloadDocument = (doc: NeedRegistrationDocument) => {
    const url = resolveAssetUrl(doc.url);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', doc.originalName || doc.fileName || 'arquivo');
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderPreviewContent = () => {
    if (!previewDoc) return null;

    const fileUrl = resolveAssetUrl(previewDoc.url);

    if (isImageFile(previewDoc)) {
      return (
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            minHeight: 420,
            background: '#fafafa',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <img
            src={fileUrl}
            alt={previewDoc.originalName}
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
            }}
          />
        </div>
      );
    }

    if (isPdfFile(previewDoc)) {
      return (
        <iframe
          src={fileUrl}
          title={previewDoc.originalName}
          style={{
            width: '100%',
            height: '72vh',
            border: 'none',
            borderRadius: 12,
            background: '#fff',
          }}
        />
      );
    }

    return (
      <div
        style={{
          display: 'grid',
          gap: 16,
          justifyItems: 'center',
          alignContent: 'center',
          minHeight: 320,
          textAlign: 'center',
          background: '#fafafa',
          borderRadius: 12,
          padding: 24,
        }}
      >
        <FileOutlined style={{ fontSize: 48 }} />
        <Space direction="vertical" size={4}>
          <Text strong>{previewDoc.originalName}</Text>
          <Text type="secondary">Pré-visualização não disponível para este formato.</Text>
        </Space>

        <Space wrap>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadDocument(previewDoc)}
            style={{ borderRadius: 12 }}
          >
            Download
          </Button>
          <Button
            icon={<EyeOutlined />}
            onClick={() => window.open(fileUrl, '_blank')}
            style={{ borderRadius: 12 }}
          >
            Abrir arquivo
          </Button>
        </Space>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!summary) {
    return <Empty description="Homologação não encontrada" />;
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: 16,
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}
    >
      <Card
        style={sectionCardStyle()}
        styles={{
          body: {
            ...sectionBodyStyle(isMobile ? 16 : 22),
            background:
              'linear-gradient(180deg, rgba(248,250,252,0.95) 0%, rgba(255,255,255,1) 100%)',
          },
        }}
      >
        <Space
          style={{
            width: '100%',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Space direction="vertical" size={4}>
            <Space wrap>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                style={{ borderRadius: 12 }}
              >
                Voltar
              </Button>

              {getTag(summary.need.homologationStatus)}
            </Space>

            <Title level={3} style={{ margin: 0 }}>
              Homologação do prestador
            </Title>

            <Text type="secondary">
              {summary.need.requestedName || summary.need.providerName || 'Prestador'}{' '}
              {summary.need.requestedLocationText
                ? `• ${summary.need.requestedLocationText}`
                : ''}
            </Text>
          </Space>

          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                qc.invalidateQueries({ queryKey: ['need-homologation', needId] });
                qc.invalidateQueries({ queryKey: ['need-homologation-invites', needId] });
              }}
              style={{ borderRadius: 12 }}
            >
              Atualizar
            </Button>

            <Tooltip
              title={
                canSendToFinance
                  ? 'Enviar alerta ao financeiro para criação do código do prestador'
                  : 'Disponível somente quando o cadastro estiver aprovado e 100% completo'
              }
            >
              <Button
                type="primary"
                icon={<MailOutlined />}
                disabled={!canSendToFinance}
                onClick={() => setFinanceModalOpen(true)}
                style={{ borderRadius: 12 }}
              >
                Enviar para o financeiro
              </Button>
            </Tooltip>

            <Button
              type="primary"
              icon={<LinkOutlined />}
              onClick={openInviteModal}
              style={{ borderRadius: 12 }}
            >
              Gerar link
            </Button>
          </Space>
        </Space>
      </Card>

      {canSendToFinance && (
        <Alert
          type="success"
          showIcon
          message="Pronto para envio ao financeiro"
          description="O cadastro está aprovado e 100% completo. Você já pode usar o botão 'Enviar para o financeiro'."
          style={{ borderRadius: 14 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card style={sectionCardStyle()} styles={{ body: sectionBodyStyle() }}>
            <Statistic
              title="Progresso geral"
              value={overallProgressPercent}
              suffix="%"
              prefix={<CheckCircleOutlined />}
            />
            <Progress percent={overallProgressPercent} style={{ marginTop: 12 }} />
            <Text type="secondary">
              Combina dados preenchidos + documentos obrigatórios enviados
            </Text>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card style={sectionCardStyle()} styles={{ body: sectionBodyStyle() }}>
            <Statistic
              title="Dados obrigatórios"
              value={`${filledRequiredFields}/${totalRequiredFields}`}
              prefix={<CheckOutlined />}
            />
            <Progress percent={dataCompletionPercent} style={{ marginTop: 12 }} />
            <Text type="secondary">
              Campos principais do cadastro preenchidos
            </Text>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card style={sectionCardStyle()} styles={{ body: sectionBodyStyle() }}>
            <Statistic
              title="Documentos obrigatórios"
              value={`${summary.progress.requiredSent}/${summary.progress.requiredTotal}`}
              prefix={<ClockCircleOutlined />}
            />
            <Progress percent={documentsCompletionPercent} style={{ marginTop: 12 }} />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Aprovados: {summary.progress.requiredApproved}/{summary.progress.requiredTotal}
              </Text>
              <br />
              <Text type="secondary">
                Pendentes: {requiredPending}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        title="Dados enviados pelo técnico"
        style={sectionCardStyle()}
        styles={{ body: sectionBodyStyle() }}
        extra={registration ? getTag(registration.status) : null}
      >
        {!registration ? (
          <Empty description="Nenhum cadastro iniciado ainda" />
        ) : (
          <>
            <Descriptions
              bordered
              size="small"
              column={isMobile ? 1 : 2}
              labelStyle={{ width: isMobile ? undefined : 220 }}
            >
              <Descriptions.Item label="Nome completo">{registration.fullName || '—'}</Descriptions.Item>
              <Descriptions.Item label="RG">{registration.rg || '—'}</Descriptions.Item>
              <Descriptions.Item label="CPF">{registration.cpf || '—'}</Descriptions.Item>
              <Descriptions.Item label="Data de nascimento">{fmtDate(registration.birthDate)}</Descriptions.Item>
              <Descriptions.Item label="Nome da mãe">{registration.motherName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Telefone">{registration.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="E-mail">{registration.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="CNPJ">{registration.cnpj || '—'}</Descriptions.Item>
              <Descriptions.Item label="Empresa">{registration.company || '—'}</Descriptions.Item>
              <Descriptions.Item label="Função">{registration.roleName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Endereço">{registration.address || '—'}</Descriptions.Item>
              <Descriptions.Item label="Bairro">{registration.district || '—'}</Descriptions.Item>
              <Descriptions.Item label="Cidade">{registration.city || '—'}</Descriptions.Item>
              <Descriptions.Item label="UF">{registration.state || '—'}</Descriptions.Item>
              <Descriptions.Item label="CEP">{registration.zipCode || '—'}</Descriptions.Item>
              <Descriptions.Item label="Enviado em">{fmtDateTime(registration.submittedAt)}</Descriptions.Item>

              <Descriptions.Item label="Contato agendamento">
                {registration.schedulingContactName || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="E-mail agendamento">
                {registration.schedulingContactEmail || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Telefone agendamento">
                {registration.schedulingContactPhone || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Contato pagamento">
                {registration.paymentContactName || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="E-mail pagamento">
                {registration.paymentContactEmail || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Telefone pagamento">
                {registration.paymentContactPhone || '—'}
              </Descriptions.Item>

              <Descriptions.Item label="Banco">{registration.bankName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Código banco">{registration.bankCode || '—'}</Descriptions.Item>
              <Descriptions.Item label="Agência">{registration.agency || '—'}</Descriptions.Item>
              <Descriptions.Item label="Dígito agência">{registration.agencyDigit || '—'}</Descriptions.Item>
              <Descriptions.Item label="Conta">{registration.accountNumber || '—'}</Descriptions.Item>
              <Descriptions.Item label="Dígito conta">{registration.accountDigit || '—'}</Descriptions.Item>

              <Descriptions.Item label="Testemunha">{registration.witnessName || '—'}</Descriptions.Item>
              <Descriptions.Item label="CPF testemunha">{registration.witnessCpf || '—'}</Descriptions.Item>
              <Descriptions.Item label="E-mail testemunha">{registration.witnessEmail || '—'}</Descriptions.Item>
              <Descriptions.Item label="Telefone testemunha">{registration.witnessPhone || '—'}</Descriptions.Item>
            </Descriptions>

            {missingDataFields.length > 0 ? (
              <Alert
                style={{ marginTop: 16, borderRadius: 14 }}
                type="warning"
                showIcon
                message="Existem dados obrigatórios faltando"
                description={
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {missingDataFields.map((field) => (
                      <Tag key={field.key} color="orange" style={{ borderRadius: 999 }}>
                        {field.label}
                      </Tag>
                    ))}
                  </div>
                }
              />
            ) : (
              <Alert
                style={{ marginTop: 16, borderRadius: 14 }}
                type="success"
                showIcon
                message="Dados principais preenchidos"
              />
            )}

            <Divider />

            <Space direction="vertical" style={{ width: '100%' }} size={10}>
              <Text strong>Parecer da homologação</Text>
              <Input.TextArea
                rows={4}
                placeholder="Escreva observações da análise"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                style={{ borderRadius: 14 }}
              />

              <Space wrap>
                <Button
                  icon={<ClockCircleOutlined />}
                  onClick={() => handleReviewRegistration('UNDER_REVIEW')}
                  loading={reviewRegistration.isPending}
                  style={{ borderRadius: 12 }}
                >
                  Em análise
                </Button>

                <Button
                  icon={<StopOutlined />}
                  onClick={() => handleReviewRegistration('ADJUSTMENT_REQUIRED')}
                  loading={reviewRegistration.isPending}
                  style={{ borderRadius: 12 }}
                >
                  Solicitar ajuste
                </Button>

                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => handleReviewRegistration('APPROVED')}
                  loading={reviewRegistration.isPending}
                  style={{ borderRadius: 12 }}
                >
                  Aprovar cadastro
                </Button>

                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => handleReviewRegistration('REJECTED')}
                  loading={reviewRegistration.isPending}
                  style={{ borderRadius: 12 }}
                >
                  Reprovar cadastro
                </Button>
              </Space>
            </Space>
          </>
        )}
      </Card>

      <Card
        title="Checklist dos documentos obrigatórios"
        style={sectionCardStyle()}
        styles={{ body: sectionBodyStyle() }}
      >
        {!summary.requiredChecklist?.length ? (
          <Empty description="Nenhum tipo de documento configurado" />
        ) : (
          <Row gutter={[16, 16]}>
            {summary.requiredChecklist.map((item) => {
              const docs = documentsByType.get(item.documentTypeId) || [];
              const latest = item.latestDocument || docs[0] || null;

              return (
                <Col xs={24} lg={12} key={item.documentTypeId}>
                  <Card
                    size="small"
                    style={{
                      borderRadius: 18,
                      border: '1px solid #eef2f7',
                      height: '100%',
                    }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      <Space
                        style={{
                          width: '100%',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <Space direction="vertical" size={2}>
                          <Text strong>{item.name}</Text>
                          <Text type="secondary">{item.description || 'Documento obrigatório'}</Text>
                        </Space>

                        {getTag(item.latestStatus || (item.sentCount ? 'SENT' : 'PENDING'))}
                      </Space>

                      <Space wrap>
                        <Tag color="blue" style={{ borderRadius: 999 }}>
                          Enviados: {item.sentCount}
                        </Tag>

                        {item.templateUrl ? (
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            style={{ borderRadius: 10 }}
                            onClick={() => window.open(resolveAssetUrl(item.templateUrl), '_blank')}
                          >
                            Ver modelo
                          </Button>
                        ) : null}

                        <Upload
                          showUploadList={false}
                          beforeUpload={(file) => {
                            uploadTemplate.mutate({
                              documentTypeId: item.documentTypeId,
                              file,
                            });
                            return false;
                          }}
                        >
                          <Button
                            size="small"
                            icon={<UploadOutlined />}
                            loading={uploadTemplate.isPending}
                            style={{ borderRadius: 10 }}
                          >
                            Modelo
                          </Button>
                        </Upload>
                      </Space>

                      {!docs.length ? (
                        <Alert
                          type="warning"
                          showIcon
                          message="Documento ainda não enviado"
                          style={{ borderRadius: 12 }}
                        />
                      ) : (
                        <List
                          size="small"
                          dataSource={docs}
                          renderItem={(doc) => (
                            <List.Item
                              actions={[
                                <Tooltip title="Visualizar" key="view">
                                  <Button
                                    type="text"
                                    icon={<EyeOutlined />}
                                    onClick={() => handlePreviewDocument(doc)}
                                  />
                                </Tooltip>,
                                <Tooltip title="Download" key="download">
                                  <Button
                                    type="text"
                                    icon={<DownloadOutlined />}
                                    onClick={() => handleDownloadDocument(doc)}
                                  />
                                </Tooltip>,
                                <Tooltip title="Aprovar" key="approve">
                                  <Button
                                    type="text"
                                    icon={<CheckOutlined />}
                                    onClick={() => askNotesAndReview(doc.id, 'APPROVED')}
                                    loading={reviewDocument.isPending}
                                  />
                                </Tooltip>,
                                <Tooltip title="Reprovar" key="reject">
                                  <Button
                                    danger
                                    type="text"
                                    icon={<CloseOutlined />}
                                    onClick={() => askNotesAndReview(doc.id, 'REJECTED')}
                                    loading={reviewDocument.isPending}
                                  />
                                </Tooltip>,
                              ]}
                            >
                              <List.Item.Meta
                                avatar={<FileOutlined style={{ fontSize: 18 }} />}
                                title={
                                  <Space wrap>
                                    <Text strong>{doc.originalName}</Text>
                                    {getTag(doc.status)}
                                  </Space>
                                }
                                description={
                                  <Space direction="vertical" size={2}>
                                    <Text type="secondary">
                                      Enviado em {fmtDateTime(doc.uploadedAt || doc.createdAt)}
                                    </Text>
                                    <Text type="secondary">Tamanho: {fileSize(doc.size)}</Text>
                                    {doc.reviewedAt ? (
                                      <Text type="secondary">
                                        Revisado em {fmtDateTime(doc.reviewedAt)}
                                        {doc.reviewedBy?.name ? ` por ${doc.reviewedBy.name}` : ''}
                                      </Text>
                                    ) : null}
                                    {doc.notes ? (
                                      <Text type="secondary">Observação: {doc.notes}</Text>
                                    ) : null}
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      )}

                      {latest?.status === 'REJECTED' ? (
                        <Alert
                          type="error"
                          showIcon
                          message="Documento reprovado"
                          description={latest.notes || 'Verifique o arquivo enviado'}
                          style={{ borderRadius: 12 }}
                        />
                      ) : null}
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            title="Arquivos adicionais"
            style={sectionCardStyle()}
            styles={{ body: { ...sectionBodyStyle(), minHeight: 220 } }}
            extra={
              <Tag color="purple" style={{ borderRadius: 999 }}>
                {summary.progress.extraUsed}/{summary.progress.extraLimit}
              </Tag>
            }
          >
            {!summary.additionalDocuments?.length ? (
              <Empty description="Nenhum arquivo adicional enviado" />
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={summary.additionalDocuments}
                renderItem={(doc) => (
                  <List.Item
                    actions={[
                      <Button
                        key="view"
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => handlePreviewDocument(doc)}
                      >
                        Visualizar
                      </Button>,
                      <Button
                        key="download"
                        type="text"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownloadDocument(doc)}
                      >
                        Download
                      </Button>,
                      <Button
                        key="approve"
                        type="text"
                        icon={<CheckOutlined />}
                        onClick={() => askNotesAndReview(doc.id, 'APPROVED')}
                        loading={reviewDocument.isPending}
                      >
                        Aprovar
                      </Button>,
                      <Button
                        key="reject"
                        danger
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={() => askNotesAndReview(doc.id, 'REJECTED')}
                        loading={reviewDocument.isPending}
                      >
                        Reprovar
                      </Button>,
                      <Button
                        key="delete"
                        danger
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => deleteDocument.mutate(doc.id)}
                        loading={deleteDocument.isPending}
                      >
                        Excluir
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<FileOutlined style={{ fontSize: 18 }} />}
                      title={
                        <Space wrap>
                          <Text strong>{doc.originalName}</Text>
                          {getTag(doc.status)}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={2}>
                          <Text type="secondary">
                            Enviado em {fmtDateTime(doc.uploadedAt || doc.createdAt)}
                          </Text>
                          <Text type="secondary">Tamanho: {fileSize(doc.size)}</Text>
                          {doc.notes ? <Text type="secondary">Observação: {doc.notes}</Text> : null}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title="Documentos internos"
            style={sectionCardStyle()}
            styles={{ body: { ...sectionBodyStyle(), minHeight: 220 } }}
            extra={
              <Upload
                showUploadList={false}
                beforeUpload={(file) => {
                  setPendingInternalFile(file);
                  setInternalUploadNotes('');
                  setOpenInternalUploadModal(true);
                  return false;
                }}
              >
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  style={{ borderRadius: 12 }}
                >
                  Enviar
                </Button>
              </Upload>
            }
          >
            {!summary.internalDocuments?.length ? (
              <Empty description="Nenhum documento interno" />
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={summary.internalDocuments}
                renderItem={(doc) => (
                  <List.Item
                    actions={[
                      <Button
                        key="view"
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => handlePreviewDocument(doc)}
                      >
                        Visualizar
                      </Button>,
                      <Button
                        key="download"
                        type="text"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownloadDocument(doc)}
                      >
                        Download
                      </Button>,
                      <Button
                        key="delete"
                        danger
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => deleteDocument.mutate(doc.id)}
                        loading={deleteDocument.isPending}
                      >
                        Excluir
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<FileOutlined style={{ fontSize: 18 }} />}
                      title={
                        <Space wrap>
                          <Text strong>{doc.originalName}</Text>
                          {getTag(doc.status)}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={2}>
                          <Text type="secondary">
                            Enviado em {fmtDateTime(doc.uploadedAt || doc.createdAt)}
                          </Text>
                          <Text type="secondary">Tamanho: {fileSize(doc.size)}</Text>
                          {doc.notes ? <Text type="secondary">Observação: {doc.notes}</Text> : null}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title="Links gerados"
        style={sectionCardStyle()}
        styles={{ body: sectionBodyStyle() }}
      >
        {loadingInvites ? (
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 120 }}>
            <Spin />
          </div>
        ) : !invites.length ? (
          <Empty description="Nenhum link gerado" />
        ) : (
          <List
            itemLayout="vertical"
            dataSource={invites}
            renderItem={(invite) => (
              <List.Item
                key={invite.id}
                actions={[
                  invite.publicLink ? (
                    <Button
                      key="copy"
                      type="text"
                      icon={<CopyOutlined />}
                      onClick={() => copyInviteLink(invite.publicLink!)}
                    >
                      Copiar link
                    </Button>
                  ) : null,
                  invite.technicianPhone && invite.publicLink ? (
                    <Button
                      key="whatsapp"
                      type="text"
                      icon={<WhatsAppOutlined />}
                      onClick={() => sendWhatsApp(invite)}
                    >
                      Reenviar WhatsApp
                    </Button>
                  ) : null,
                  invite.technicianEmail ? (
                    <Button
                      key="email"
                      type="text"
                      icon={<MailOutlined />}
                      onClick={() => resendInviteEmail.mutate(invite.id)}
                      loading={resendInviteEmail.isPending}
                    >
                      Reenviar e-mail
                    </Button>
                  ) : null,
                  invite.publicLink ? (
                    <Button
                      key="open"
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={() => window.open(invite.publicLink!, '_blank')}
                    >
                      Abrir link
                    </Button>
                  ) : null,
                  invite.status !== 'CANCELLED' ? (
                    <Button
                      key="cancel"
                      danger
                      type="text"
                      icon={<StopOutlined />}
                      onClick={() => cancelInvite.mutate(invite.id)}
                      loading={cancelInvite.isPending}
                    >
                      Cancelar
                    </Button>
                  ) : null,
                ].filter(Boolean)}
              >
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Space wrap>
                    <Text strong>{invite.technicianName}</Text>
                    {getTag(invite.status)}
                  </Space>

                  <Space wrap>
                    {invite.technicianEmail ? (
                      <Tag style={{ borderRadius: 999 }} icon={<MailOutlined />}>
                        {invite.technicianEmail}
                      </Tag>
                    ) : null}

                    {invite.technicianPhone ? (
                      <Tag style={{ borderRadius: 999 }} icon={<WhatsAppOutlined />}>
                        {invite.technicianPhone}
                      </Tag>
                    ) : null}
                  </Space>

                  <Paragraph copyable={!!invite.publicLink} style={{ marginBottom: 4 }}>
                    {invite.publicLink || '—'}
                  </Paragraph>

                  <Space wrap>
                    <Text type="secondary">Expira em: {fmtDate(invite.expiresAt)}</Text>
                    <Text type="secondary">Aberto em: {fmtDateTime(invite.openedAt)}</Text>
                    <Text type="secondary">Usado em: {fmtDateTime(invite.usedAt)}</Text>
                    <Text type="secondary">Último envio: {fmtDateTime(invite.lastSentAt)}</Text>
                  </Space>
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        open={financeModalOpen}
        onCancel={() => {
          if (sendToFinanceMut.isPending) return;
          setFinanceModalOpen(false);
        }}
        onOk={() => financeForm.submit()}
        confirmLoading={sendToFinanceMut.isPending}
        title="Enviar para o financeiro"
        width={760}
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          message="O prestador já se encontra na aba Prestadores Ativos"
          description="Os dados do novo prestador já estão completos no sistema. Este envio serve para alertar o financeiro a criar o código do prestador."
          style={{ borderRadius: 12, marginBottom: 16 }}
        />

        <Form
          layout="vertical"
          form={financeForm}
          onFinish={(values) =>
            sendToFinanceMut.mutate({
              to: Array.isArray(values.to) ? values.to : [],
              cc: Array.isArray(values.cc) ? values.cc : [],
              subject: values.subject,
              message: values.message,
            })
          }
        >
          <Form.Item
            name="to"
            label="Enviar para"
            rules={[{ required: true, message: 'Informe ao menos um e-mail' }]}
            extra="Os e-mails padrão já vêm preenchidos, mas você pode adicionar outros."
          >
            <Select
              mode="tags"
              tokenSeparators={[',', ';']}
              placeholder="Digite os e-mails"
              style={{ width: '100%' }}
              options={defaultFinanceEmails.map((email) => ({
                label: email,
                value: email,
              }))}
            />
          </Form.Item>

          <Form.Item name="cc" label="Com cópia">
            <Select
              mode="tags"
              tokenSeparators={[',', ';']}
              placeholder="Adicionar cópias"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="subject"
            label="Assunto"
            rules={[{ required: true, message: 'Informe o assunto' }]}
          >
            <Input style={{ borderRadius: 12 }} />
          </Form.Item>

          <Form.Item
            name="message"
            label="Mensagem"
            rules={[{ required: true, message: 'Informe a mensagem' }]}
          >
            <Input.TextArea rows={8} style={{ borderRadius: 12 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={openInvite}
        onCancel={() => setOpenInvite(false)}
        footer={null}
        title="Gerar link de homologação"
        destroyOnHidden
      >
        <Form
          form={formInvite}
          layout="vertical"
          onFinish={(values) => createInvite.mutate(values)}
          initialValues={{ expiresInDays: 15 }}
        >
          <Form.Item
            label="Nome do prestador"
            name="technicianName"
            rules={[{ required: true, message: 'Informe o nome' }]}
          >
            <Input placeholder="Nome do prestador" style={{ borderRadius: 12 }} />
          </Form.Item>

          <Form.Item label="E-mail" name="technicianEmail">
            <Input placeholder="email@exemplo.com" style={{ borderRadius: 12 }} />
          </Form.Item>

          <Form.Item label="Telefone / WhatsApp" name="technicianPhone">
            <Input placeholder="11999999999" style={{ borderRadius: 12 }} />
          </Form.Item>

          <Form.Item label="Expira em (dias)" name="expiresInDays">
            <Input type="number" min={1} max={90} style={{ borderRadius: 12 }} />
          </Form.Item>

          <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setOpenInvite(false)} style={{ borderRadius: 12 }}>
              Fechar
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createInvite.isPending}
              style={{ borderRadius: 12 }}
            >
              Gerar link
            </Button>
          </Space>
        </Form>

        {inviteLink ? (
          <>
            <Divider />
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Alert
                type="success"
                showIcon
                message="Link gerado com sucesso"
                description={inviteLink}
                style={{ borderRadius: 14 }}
              />

              <Space wrap>
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => copyInviteLink(inviteLink)}
                  style={{ borderRadius: 12 }}
                >
                  Copiar link
                </Button>

                <Button
                  icon={<EyeOutlined />}
                  onClick={() => window.open(inviteLink, '_blank')}
                  style={{ borderRadius: 12 }}
                >
                  Abrir link
                </Button>

                <Button
                  icon={<WhatsAppOutlined />}
                  onClick={() => sendWhatsApp()}
                  style={{ borderRadius: 12 }}
                >
                  Enviar por WhatsApp
                </Button>
              </Space>
            </Space>
          </>
        ) : null}
      </Modal>

      <Modal
        open={openInternalUploadModal}
        onCancel={() => {
          if (uploadInternalDocument.isPending) return;
          setOpenInternalUploadModal(false);
          setInternalUploadNotes('');
          setPendingInternalFile(null);
        }}
        title="Enviar documento interno"
        destroyOnHidden
        footer={
          <Space>
            <Button
              onClick={() => {
                setOpenInternalUploadModal(false);
                setInternalUploadNotes('');
                setPendingInternalFile(null);
              }}
              disabled={uploadInternalDocument.isPending}
              style={{ borderRadius: 12 }}
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploadInternalDocument.isPending}
              disabled={!pendingInternalFile}
              onClick={() => {
                if (!pendingInternalFile) {
                  message.warning('Selecione um arquivo');
                  return;
                }

                uploadInternalDocument.mutate({
                  file: pendingInternalFile,
                  notes: internalUploadNotes,
                });
              }}
              style={{ borderRadius: 12 }}
            >
              Enviar documento
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message={pendingInternalFile ? pendingInternalFile.name : 'Nenhum arquivo selecionado'}
            description={
              pendingInternalFile
                ? `Tamanho: ${fileSize(pendingInternalFile.size)}`
                : 'Selecione um arquivo para continuar.'
            }
            style={{ borderRadius: 12 }}
          />

          <div>
            <Text strong>Observação (opcional)</Text>
            <Input.TextArea
              rows={4}
              value={internalUploadNotes}
              onChange={(e) => setInternalUploadNotes(e.target.value)}
              placeholder="Digite uma observação para este documento"
              style={{ marginTop: 8, borderRadius: 12 }}
            />
          </div>
        </Space>
      </Modal>

      <Modal
        open={previewOpen}
        onCancel={() => {
          setPreviewOpen(false);
          setPreviewDoc(null);
        }}
        title={previewDoc?.originalName || 'Visualizar arquivo'}
        width={isMobile ? '95%' : 1000}
        destroyOnHidden
        footer={
          previewDoc ? (
            <Space wrap>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadDocument(previewDoc)}
                style={{ borderRadius: 12 }}
              >
                Download
              </Button>
              <Button
                onClick={() => {
                  setPreviewOpen(false);
                  setPreviewDoc(null);
                }}
                style={{ borderRadius: 12 }}
              >
                Fechar
              </Button>
            </Space>
          ) : null
        }
      >
        {renderPreviewContent()}
      </Modal>
    </div>
  );
}