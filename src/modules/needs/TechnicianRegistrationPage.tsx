import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Progress,
  Row,
  Space,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  FileTextOutlined,
  SaveOutlined,
  SendOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { API_URL, api } from '../../lib/api';

const { Title, Text } = Typography;

type DocumentType = {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  isRequired: boolean;
  allowMultiple: boolean;
  sortOrder: number;
  active: boolean;
  templateName?: string | null;
  templateUrl?: string | null;
};

type Registration = {
  id: number;
  needId: number;
  inviteId: number;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ADJUSTMENT_REQUIRED' | 'APPROVED' | 'REJECTED';
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
  hasCltEmployees?: boolean | null;
  serviceOmnilinkWorkshop?: boolean | null;
  serviceLinkerWorkshop?: boolean | null;
  serviceOmnilinkExternal?: boolean | null;
  serviceLinkerExternal?: boolean | null;
  vehicleCar?: boolean | null;
  vehicleMoto?: boolean | null;
  vehicleTruck?: boolean | null;
  agreeTravel?: boolean | null;
  declarationAccepted?: boolean | null;
};

type UploadedDocument = {
  id: number;
  registrationId: number;
  documentTypeId: number;
  status: 'PENDING' | 'SENT' | 'APPROVED' | 'REJECTED';
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  notes?: string | null;
  uploadedAt: string;
};

type OpenResponse = {
  invite: {
    id: number;
    technicianName: string;
    technicianEmail?: string | null;
    technicianPhone?: string | null;
    expiresAt?: string | null;
    status: string;
  };
  need: {
    id: number;
    requestedName?: string | null;
    providerName?: string | null;
    requestedLocationText?: string | null;
    homologationStatus?: string | null;
  };
  registration: Registration;
  documentTypes: DocumentType[];
  documents: UploadedDocument[];
  config?: {
    extraDocumentCode?: string;
    extraLimit?: number;
  };
};

function onlyDigits(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function maskCpf(value?: string | null) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function maskCnpj(value?: string | null) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function maskCep(value?: string | null) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
}

function maskPhone(value?: string | null) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function resolveAssetUrl(url?: string | null) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL}${String(url).startsWith('/') ? '' : '/'}${url}`;
}

function pageCardStyle(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: '1px solid #e5e7eb',
    boxShadow: '0 8px 28px rgba(15, 23, 42, 0.05)',
  };
}

function sectionTitle(text: string) {
  return (
    <Divider orientation="left" style={{ marginTop: 8 }}>
      <Text strong>{text}</Text>
    </Divider>
  );
}

function getDocStatusTag(status?: string | null) {
  const map: Record<string, { color: string; label: string }> = {
    APPROVED: { color: 'green', label: 'Aprovado' },
    REJECTED: { color: 'red', label: 'Reprovado' },
    SENT: { color: 'blue', label: 'Enviado' },
    PENDING: { color: 'default', label: 'Pendente' },
  };

  const info = map[String(status || '')] || { color: 'default', label: 'Pendente' };
  return (
    <Tag color={info.color} style={{ borderRadius: 999 }}>
      {info.label}
    </Tag>
  );
}

function getRegistrationStatusTag(status?: string | null) {
  const map: Record<string, { color: string; label: string }> = {
    DRAFT: { color: 'default', label: 'Rascunho' },
    SUBMITTED: { color: 'blue', label: 'Enviado para análise' },
    UNDER_REVIEW: { color: 'gold', label: 'Em análise' },
    ADJUSTMENT_REQUIRED: { color: 'orange', label: 'Ajuste solicitado' },
    APPROVED: { color: 'green', label: 'Aprovado' },
    REJECTED: { color: 'red', label: 'Reprovado' },
  };

  const info = map[String(status || '')] || { color: 'default', label: status || '—' };
  return (
    <Tag color={info.color} style={{ borderRadius: 999 }}>
      {info.label}
    </Tag>
  );
}

function fileSize(size?: number | null) {
  if (!size) return '—';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

export default function TechnicianRegistrationPage() {
  const { token = '' } = useParams();
  const [form] = Form.useForm();

  const [openVehicleDocsModal, setOpenVehicleDocsModal] = useState(false);
  const [openWorkshopDocsModal, setOpenWorkshopDocsModal] = useState(false);

  const vehicleModalShownRef = useRef(false);
  const workshopModalShownRef = useRef(false);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<OpenResponse>({
    queryKey: ['public-tech-registration', token],
    queryFn: async () => (await api.get(`/need-homologation/public/${token}`)).data,
    enabled: !!token,
    retry: false,
  });
  const errorCode = (error as any)?.response?.data?.code || null;
  const errorMessage =
    (error as any)?.response?.data?.message ||
    (error as any)?.response?.data?.error ||
    'Não foi possível abrir este link.';
  useEffect(() => {
    if (data?.registration) {
      form.setFieldsValue({
        ...data.registration,
        cpf: maskCpf(data.registration.cpf),
        cnpj: maskCnpj(data.registration.cnpj),
        zipCode: maskCep(data.registration.zipCode),
        phone: maskPhone(data.registration.phone),
        schedulingContactPhone: maskPhone(data.registration.schedulingContactPhone),
        paymentContactPhone: maskPhone(data.registration.paymentContactPhone),
        witnessCpf: maskCpf(data.registration.witnessCpf),
        witnessPhone: maskPhone(data.registration.witnessPhone),
        hasCltEmployees: !!data.registration.hasCltEmployees,
        serviceOmnilinkWorkshop: !!data.registration.serviceOmnilinkWorkshop,
        serviceLinkerWorkshop: !!data.registration.serviceLinkerWorkshop,
        serviceOmnilinkExternal: !!data.registration.serviceOmnilinkExternal,
        serviceLinkerExternal: !!data.registration.serviceLinkerExternal,
        vehicleCar: !!data.registration.vehicleCar,
        vehicleMoto: !!data.registration.vehicleMoto,
        vehicleTruck: !!data.registration.vehicleTruck,
        agreeTravel: !!data.registration.agreeTravel,
        declarationAccepted: !!data.registration.declarationAccepted,
      });

      vehicleModalShownRef.current =
        !!data.registration.vehicleCar ||
        !!data.registration.vehicleMoto ||
        !!data.registration.vehicleTruck;

      workshopModalShownRef.current =
        !!data.registration.serviceOmnilinkWorkshop ||
        !!data.registration.serviceLinkerWorkshop;
    }
  }, [data, form]);

  const vehicleCar = Form.useWatch('vehicleCar', form);
  const vehicleMoto = Form.useWatch('vehicleMoto', form);
  const vehicleTruck = Form.useWatch('vehicleTruck', form);
  const serviceOmnilinkWorkshop = Form.useWatch('serviceOmnilinkWorkshop', form);
  const serviceLinkerWorkshop = Form.useWatch('serviceLinkerWorkshop', form);

  useEffect(() => {
    const hasVehicle = !!vehicleCar || !!vehicleMoto || !!vehicleTruck;
    if (hasVehicle && !vehicleModalShownRef.current) {
      setOpenVehicleDocsModal(true);
      vehicleModalShownRef.current = true;
    }
  }, [vehicleCar, vehicleMoto, vehicleTruck]);

  useEffect(() => {
    const hasWorkshop = !!serviceOmnilinkWorkshop || !!serviceLinkerWorkshop;
    if (hasWorkshop && !workshopModalShownRef.current) {
      setOpenWorkshopDocsModal(true);
      workshopModalShownRef.current = true;
    }
  }, [serviceOmnilinkWorkshop, serviceLinkerWorkshop]);

  const saveDraftMut = useMutation({
    mutationFn: async (payload: any) =>
      (await api.patch(`/need-homologation/public/${token}/draft`, payload)).data,
    onSuccess: () => {
      message.success('Rascunho salvo com sucesso');
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao salvar rascunho');
    },
  });

  const submitMut = useMutation({
    mutationFn: async () => (await api.post(`/need-homologation/public/${token}/submit`)).data,
    onSuccess: async () => {
      message.success('Cadastro enviado com sucesso');
      await refetch();
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao enviar cadastro');
    },
  });

  const uploadDocMut = useMutation({
    mutationFn: async (payload: { documentTypeId: number; file: File; notes?: string }) => {
      const fd = new FormData();
      fd.append('documentTypeId', String(payload.documentTypeId));
      fd.append('file', payload.file);
      if (payload.notes) fd.append('notes', payload.notes);

      return (
        await api.post(`/need-homologation/public/${token}/documents`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data;
    },
    onSuccess: async () => {
      message.success('Documento enviado');
      await refetch();
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao enviar documento');
    },
  });

  const documentsByType = useMemo(() => {
    const map = new Map<number, UploadedDocument[]>();

    (data?.documents || []).forEach((doc) => {
      const current = map.get(doc.documentTypeId) || [];
      current.push(doc);
      map.set(doc.documentTypeId, current);
    });

    return map;
  }, [data]);

  const visibleDocuments = useMemo(() => {
    return (data?.documentTypes || []).filter((doc) => {
      const code = String(doc.code || '').toUpperCase();
      const name = String(doc.name || '').toUpperCase();

      return (
        !code.includes('FICHA_CADASTRAL_ATA') &&
        !name.includes('FICHA CADASTRAL ATA') &&
        code !== 'DOCUMENTOS_INTERNOS'
      );
    });
  }, [data]);

  const requiredDocuments = useMemo(
    () => visibleDocuments.filter((d) => d.isRequired),
    [visibleDocuments]
  );

  const additionalDocumentsTypes = useMemo(
    () => visibleDocuments.filter((d) => !d.isRequired),
    [visibleDocuments]
  );

  const requiredCount = requiredDocuments.length;
  const uploadedRequiredCount = requiredDocuments.filter(
    (d) => (documentsByType.get(d.id) || []).length > 0
  ).length;

  const approvedRequiredCount = requiredDocuments.filter((d) => {
    const docs = documentsByType.get(d.id) || [];
    return docs.some((doc) => doc.status === 'APPROVED');
  }).length;

  const requiredFieldDefinitions = [
    { key: 'fullName', label: 'Nome completo' },
    { key: 'email', label: 'E-mail' },
    { key: 'phone', label: 'Telefone' },
    { key: 'rg', label: 'RG' },
    { key: 'cpf', label: 'CPF' },
    { key: 'company', label: 'Empresa' },
    { key: 'cnpj', label: 'CNPJ' },
    { key: 'birthDate', label: 'Data de nascimento' },
    { key: 'motherName', label: 'Nome da mãe' },
    { key: 'address', label: 'Endereço' },
    { key: 'district', label: 'Bairro' },
    { key: 'city', label: 'Cidade' },
    { key: 'state', label: 'UF' },
    { key: 'zipCode', label: 'CEP' },
    { key: 'bankName', label: 'Banco' },
    { key: 'bankCode', label: 'Código do banco' },
    { key: 'agency', label: 'Agência' },
    { key: 'agencyDigit', label: 'Dígito da agência' },
    { key: 'accountNumber', label: 'Conta' },
    { key: 'accountDigit', label: 'Dígito da conta' },
  ] as const;

  const filledRequiredFields = requiredFieldDefinitions.filter((field) =>
    String((data?.registration as any)?.[field.key] || '').trim()
  ).length;

  const totalRequiredFields = requiredFieldDefinitions.length;

  const dataProgress = totalRequiredFields
    ? Math.round((filledRequiredFields / totalRequiredFields) * 100)
    : 0;

  const documentsProgress = requiredCount
    ? Math.round((uploadedRequiredCount / requiredCount) * 100)
    : 0;

  const overallProgress = Math.round((dataProgress + documentsProgress) / 2);

  const missingRequiredFields = requiredFieldDefinitions.filter(
    (field) => !String((data?.registration as any)?.[field.key] || '').trim()
  );

  const additionalUsed = additionalDocumentsTypes.reduce((acc, docType) => {
    return acc + (documentsByType.get(docType.id) || []).length;
  }, 0);

  const additionalLimit = data?.config?.extraLimit || 10;

  const handleMaskedChange = (
    fieldName: string,
    formatter: (value?: string | null) => string
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setFieldsValue({
      [fieldName]: formatter(e.target.value),
    });
  };
    if (errorCode === 'LINK_CANCELLED') {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f7fb',
            padding: 24,
          }}
        >
          <Card
            style={{
              width: '100%',
              maxWidth: 620,
              borderRadius: 24,
              border: '1px solid #e5e7eb',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
            }}
            styles={{ body: { padding: 32 } }}
          >
            <Space direction="vertical" size={18} style={{ width: '100%', textAlign: 'center' }}>
              <img
                src="/logo.png"
                alt="Omnilink"
                style={{
                  display: 'block',
                  width: 250,
                  maxWidth: '100%',
                  height: 'auto',
                  margin: '0 auto',
                }}
              />

              <Text strong style={{ fontSize: 26, color: '#cf1322' }}>
                Link cancelado
              </Text>

              <Text type="secondary" style={{ fontSize: 16 }}>
                Este link foi cancelado e não pode mais ser utilizado.
              </Text>

              <Alert
                type="warning"
                showIcon
                message="Será necessário solicitar um novo link"
                description="Entre em contato com o responsável pela solicitação para que um novo link de cadastro seja enviado."
                style={{ borderRadius: 16, textAlign: 'left' }}
              />
            </Space>
          </Card>
        </div>
      );
    }

    if (errorCode === 'LINK_EXPIRED') {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f7fb',
            padding: 24,
          }}
        >
          <Card
            style={{
              width: '100%',
              maxWidth: 620,
              borderRadius: 24,
              border: '1px solid #e5e7eb',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
            }}
            styles={{ body: { padding: 32 } }}
          >
            <Space direction="vertical" size={18} style={{ width: '100%', textAlign: 'center' }}>
              <img
                src="/logo.png"
                alt="Omnilink"
                style={{
                  display: 'block',
                  width: 420,
                  maxWidth: '100%',
                  height: 'auto',
                  margin: '0 auto',
                }}
              />

              <Text strong style={{ fontSize: 26, color: '#d48806' }}>
                Link expirado
              </Text>

              <Text type="secondary" style={{ fontSize: 16 }}>
                Este link expirou e não pode mais ser utilizado.
              </Text>

              <Alert
                type="warning"
                showIcon
                message="Será necessário solicitar um novo link"
                description="Peça ao responsável pela homologação que gere um novo link de cadastro."
                style={{ borderRadius: 16, textAlign: 'left' }}
              />
            </Space>
          </Card>
        </div>
      );
    }

    if (error && !errorCode) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f7fb',
            padding: 24,
          }}
        >
          <Card
            style={{
              width: '100%',
              maxWidth: 620,
              borderRadius: 24,
              border: '1px solid #e5e7eb',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
            }}
            styles={{ body: { padding: 32 } }}
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Text strong style={{ fontSize: 24 }}>
                Não foi possível abrir o link
              </Text>
              <Alert
                type="error"
                showIcon
                message={errorMessage}
                style={{ borderRadius: 16 }}
              />
            </Space>
          </Card>
        </div>
      );
    }
    const loadingOverlayOpen =
      isLoading ||
      saveDraftMut.isPending ||
      submitMut.isPending ||
      uploadDocMut.isPending;

    if (loadingOverlayOpen) {
      return (
        <>
          <style>
            {`
              @keyframes pulseFadeLogo {
                0% {
                  opacity: 0.55;
                  transform: scale(0.985);
                }
                50% {
                  opacity: 1;
                  transform: scale(1.02);
                }
                100% {
                  opacity: 0.55;
                  transform: scale(0.985);
                }
              }
            `}
          </style>

          <Modal
            open
            closable={false}
            footer={null}
            centered
            maskClosable={false}
            keyboard={false}
            width={340}
            styles={{
              body: {
                padding: 32,
                textAlign: 'center',
              },
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 18,
              }}
            >
              <img
                src="/logo.png"
                alt="Omnilink"
                style={{
                  width: 256,
                  height: 96,
                  objectFit: 'contain',
                  animation: 'pulseFadeLogo 1.8s ease-in-out infinite',
                }}
              />

              <div style={{ display: 'grid', gap: 6 }}>
                <Text strong style={{ fontSize: 18 }}>
                  Carregando...
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Aguarde enquanto buscamos as informações.
                </Text>
              </div>
            </div>
          </Modal>
        </>
      );
    }

  return (
    <>
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: 24,
          display: 'grid',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/logo.png"
            alt="Omnilink"
            style={{
              height: 70,
              objectFit: 'contain',
            }}
          />

          <div>
            <Text strong style={{ fontSize: 16 }}>OMNILINK</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Portal de Homologação Técnica
              </Text>
            </div>
          </div>
        </div>

        <Card
          style={pageCardStyle()}
          styles={{
            body: {
              padding: 24,
              background:
                'linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(255,255,255,1) 100%)',
            },
          }}
        >
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} lg={15}>
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                <Title level={3} style={{ margin: 0 }}>
                  Cadastro e homologação do técnico
                </Title>

                <Text type="secondary">
                  Preencha os dados, baixe os modelos quando houver e envie todos os documentos
                  obrigatórios para análise.
                </Text>

                <Space wrap>
                  {getRegistrationStatusTag(data?.registration?.status)}
                  <Tag color="blue" style={{ borderRadius: 999 }}>
                    Obrigatórios enviados: {uploadedRequiredCount}/{requiredCount}
                  </Tag>
                  <Tag color="purple" style={{ borderRadius: 999 }}>
                    Adicionais: {additionalUsed}/{additionalLimit}
                  </Tag>
                </Space>

                {(data?.need?.requestedName || data?.need?.requestedLocationText) && (
                  <Space wrap size={[8, 8]}>
                    {data?.need?.requestedName ? (
                      <Tag style={{ borderRadius: 999 }}>
                        Solicitação: {data.need.requestedName}
                      </Tag>
                    ) : null}
                    {data?.need?.requestedLocationText ? (
                      <Tag style={{ borderRadius: 999 }}>
                        Local: {data.need.requestedLocationText}
                      </Tag>
                    ) : null}
                  </Space>
                )}
              </Space>
            </Col>

            <Col xs={24} lg={9}>
              <div
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 20,
                  padding: 18,
                  background: '#fff',
                }}
              >
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text strong>Progresso geral</Text>
                    <Text strong>{overallProgress}%</Text>
                  </Space>
                  <Progress percent={overallProgress} />
                  <Text type="secondary">
                    Esse progresso considera os dados obrigatórios preenchidos e os documentos
                    obrigatórios enviados.
                  </Text>
                </Space>
              </div>
            </Col>
          </Row>
        </Card>

        {data?.registration?.status === 'ADJUSTMENT_REQUIRED' && (
          <Alert
            type="warning"
            showIcon
            message="Ajuste solicitado"
            description="Seu cadastro precisa de correções. Revise os dados e reenvie os documentos necessários."
            style={{ borderRadius: 16 }}
          />
        )}

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card style={pageCardStyle()} styles={{ body: { padding: 18 } }}>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Space>
                  <UserOutlined />
                  <Text strong>Dados obrigatórios</Text>
                </Space>
                <Title level={3} style={{ margin: 0 }}>
                  {filledRequiredFields}/{totalRequiredFields}
                </Title>
                <Progress percent={dataProgress} />
                <Text type="secondary">Campos principais preenchidos.</Text>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card style={pageCardStyle()} styles={{ body: { padding: 18 } }}>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Space>
                  <FileTextOutlined />
                  <Text strong>Documentos obrigatórios</Text>
                </Space>
                <Title level={3} style={{ margin: 0 }}>
                  {uploadedRequiredCount}/{requiredCount}
                </Title>
                <Progress percent={documentsProgress} />
                <Text type="secondary">Arquivos obrigatórios enviados.</Text>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card style={pageCardStyle()} styles={{ body: { padding: 18 } }}>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Space>
                  <CheckCircleOutlined />
                  <Text strong>Documentos aprovados</Text>
                </Space>
                <Title level={3} style={{ margin: 0 }}>
                  {approvedRequiredCount}/{requiredCount}
                </Title>
                <Progress
                  percent={
                    requiredCount ? Math.round((approvedRequiredCount / requiredCount) * 100) : 0
                  }
                />
                <Text type="secondary">Status da análise interna.</Text>
              </Space>
            </Card>
          </Col>
        </Row>

        {!!missingRequiredFields.length && (
          <Alert
            type="info"
            showIcon
            message="Ainda faltam alguns dados obrigatórios"
            description={
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {missingRequiredFields.map((field) => (
                  <Tag key={field.key} color="orange" style={{ borderRadius: 999 }}>
                    {field.label}
                  </Tag>
                ))}
              </div>
            }
            style={{ borderRadius: 16 }}
          />
        )}

        <Card
          title="Dados do cadastro"
          style={pageCardStyle()}
          styles={{ body: { padding: 22 } }}
        >
          <Form form={form} layout="vertical" onFinish={(values) => saveDraftMut.mutate(values)}>
            {sectionTitle('Dados do técnico')}

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="fullName" label="Nome completo" rules={[{ required: true }]}>
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  name="rg"
                  label="RG"
                  rules={[{ required: true, message: 'Informe o RG' }]}
                >
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item name="cpf" label="CPF" rules={[{ required: true }]}>
                  <Input
                    maxLength={14}
                    style={{ borderRadius: 12 }}
                    onChange={handleMaskedChange('cpf', maskCpf)}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  name="birthDate"
                  label="Data de nascimento"
                  rules={[{ required: true }]}
                >
                  <Input type="date" style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={16}>
                <Form.Item name="motherName" label="Nome da mãe" rules={[{ required: true }]}>
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="company"
                  label="Empresa"
                  rules={[{ required: true, message: 'Informe a empresa' }]}
                >
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  name="cnpj"
                  label="CNPJ"
                  rules={[{ required: true, message: 'Informe o CNPJ' }]}
                >
                  <Input
                    maxLength={18}
                    style={{ borderRadius: 12 }}
                    onChange={handleMaskedChange('cnpj', maskCnpj)}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item name="roleName" label="Cargo">
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item name="address" label="Endereço" rules={[{ required: true }]}>
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="district" label="Bairro" rules={[{ required: true }]}>
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="city" label="Cidade" rules={[{ required: true }]}>
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={4}>
                <Form.Item name="state" label="UF" rules={[{ required: true }]}>
                  <Input maxLength={2} style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={4}>
                <Form.Item name="zipCode" label="CEP" rules={[{ required: true }]}>
                  <Input
                    maxLength={9}
                    style={{ borderRadius: 12 }}
                    onChange={handleMaskedChange('zipCode', maskCep)}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="phone" label="Telefone" rules={[{ required: true }]}>
                  <Input
                    maxLength={15}
                    style={{ borderRadius: 12 }}
                    onChange={handleMaskedChange('phone', maskPhone)}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="email"
                  label="E-mail"
                  rules={[
                    { required: true, message: 'Informe o e-mail' },
                    { type: 'email', message: 'Informe um e-mail válido' },
                  ]}
                >
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>
            </Row>

            {sectionTitle('Contato de agendamento')}

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="schedulingContactName" label="Nome">
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="schedulingContactEmail" label="E-mail">
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="schedulingContactPhone" label="Telefone">
                  <Input
                    maxLength={15}
                    style={{ borderRadius: 12 }}
                    onChange={handleMaskedChange('schedulingContactPhone', maskPhone)}
                  />
                </Form.Item>
              </Col>
            </Row>

            {sectionTitle('Contato de pagamento')}

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="paymentContactName" label="Nome">
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="paymentContactEmail" label="E-mail">
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="paymentContactPhone" label="Telefone">
                  <Input
                    maxLength={15}
                    style={{ borderRadius: 12 }}
                    onChange={handleMaskedChange('paymentContactPhone', maskPhone)}
                  />
                </Form.Item>
              </Col>
            </Row>

            {sectionTitle('Testemunha')}

            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Form.Item name="witnessName" label="Nome">
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="witnessCpf" label="CPF">
                  <Input
                    maxLength={14}
                    style={{ borderRadius: 12 }}
                    onChange={handleMaskedChange('witnessCpf', maskCpf)}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="witnessEmail" label="E-mail">
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="witnessPhone" label="Telefone">
                  <Input
                    maxLength={15}
                    style={{ borderRadius: 12 }}
                    onChange={handleMaskedChange('witnessPhone', maskPhone)}
                  />
                </Form.Item>
              </Col>
            </Row>

            {sectionTitle('Dados bancários')}

            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Form.Item
                  name="bankName"
                  label="Banco"
                  rules={[{ required: true, message: 'Informe o banco' }]}
                >
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  name="bankCode"
                  label="Código do banco"
                  rules={[{ required: true, message: 'Informe o código do banco' }]}
                >
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={4}>
                <Form.Item
                  name="agency"
                  label="Agência"
                  rules={[{ required: true, message: 'Informe a agência' }]}
                >
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={2}>
                <Form.Item
                  name="agencyDigit"
                  label="Dígito"
                  rules={[{ required: true, message: 'Informe o dígito da agência' }]}
                >
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={4}>
                <Form.Item
                  name="accountNumber"
                  label="Conta"
                  rules={[{ required: true, message: 'Informe a conta' }]}
                >
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={2}>
                <Form.Item
                  name="accountDigit"
                  label="Dígito"
                  rules={[{ required: true, message: 'Informe o dígito da conta' }]}
                >
                  <Input style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>
            </Row>

            {sectionTitle('Segmentos e atendimento')}

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Form.Item
                  name="hasCltEmployees"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Checkbox>Possui funcionários CLT</Checkbox>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Card
                  size="small"
                  style={{ borderRadius: 18, border: '1px solid #eef2f7', height: '100%' }}
                  styles={{ body: { padding: 16 } }}
                >
                  <Text strong>Posto da autorizada / oficina</Text>
                  <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                    <Form.Item name="serviceOmnilinkWorkshop" valuePropName="checked" noStyle>
                      <Checkbox>OMNILINK</Checkbox>
                    </Form.Item>
                    <Form.Item name="serviceLinkerWorkshop" valuePropName="checked" noStyle>
                      <Checkbox>LINKER</Checkbox>
                    </Form.Item>
                  </div>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card
                  size="small"
                  style={{ borderRadius: 18, border: '1px solid #eef2f7', height: '100%' }}
                  styles={{ body: { padding: 16 } }}
                >
                  <Text strong>Atendimento externo</Text>
                  <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                    <Form.Item name="serviceOmnilinkExternal" valuePropName="checked" noStyle>
                      <Checkbox>OMNILINK</Checkbox>
                    </Form.Item>
                    <Form.Item name="serviceLinkerExternal" valuePropName="checked" noStyle>
                      <Checkbox>LINKER</Checkbox>
                    </Form.Item>
                  </div>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card
                  size="small"
                  style={{ borderRadius: 18, border: '1px solid #eef2f7', height: '100%' }}
                  styles={{ body: { padding: 16 } }}
                >
                  <Text strong>Veículos</Text>
                  <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                    <Form.Item name="vehicleCar" valuePropName="checked" noStyle>
                      <Checkbox>Carro</Checkbox>
                    </Form.Item>
                    <Form.Item name="vehicleMoto" valuePropName="checked" noStyle>
                      <Checkbox>Moto</Checkbox>
                    </Form.Item>
                    <Form.Item name="vehicleTruck" valuePropName="checked" noStyle>
                      <Checkbox>Caminhão</Checkbox>
                    </Form.Item>
                  </div>
                </Card>
              </Col>

              <Col xs={24}>
                <Card
                  size="small"
                  style={{ borderRadius: 18, border: '1px solid #eef2f7' }}
                  styles={{ body: { padding: 16 } }}
                >
                  <div style={{ display: 'grid', gap: 12 }}>
                    <Form.Item name="agreeTravel" valuePropName="checked" noStyle>
                      <Checkbox>Concordo em me deslocar para realizar os atendimentos</Checkbox>
                    </Form.Item>

                    <Form.Item name="declarationAccepted" valuePropName="checked" noStyle>
                      <Checkbox>Declaro que as informações acima são verdadeiras</Checkbox>
                    </Form.Item>
                  </div>
                </Card>
              </Col>
            </Row>

            <div style={{ marginTop: 24 }}>
              <Space wrap>
                <Button
                  type="default"
                  icon={<SaveOutlined />}
                  htmlType="submit"
                  loading={saveDraftMut.isPending}
                  style={{ borderRadius: 12 }}
                >
                  Salvar rascunho
                </Button>

                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={submitMut.isPending}
                  onClick={() => submitMut.mutate()}
                  style={{ borderRadius: 12 }}
                >
                  Concluir e enviar para análise
                </Button>
              </Space>
            </div>
          </Form>
        </Card>

        <Card
          title="Documentos para homologação"
          style={pageCardStyle()}
          styles={{ body: { padding: 22 } }}
        >
          {visibleDocuments.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Nenhum documento configurado para esta homologação"
            />
          ) : (
            <Row gutter={[16, 16]}>
              {visibleDocuments.map((doc) => {
                const currentDocs = documentsByType.get(doc.id) || [];
                const isRequired = doc.isRequired;
                const approvedFile = currentDocs.find((file) => file.status === 'APPROVED');
                const latestFile = approvedFile || currentDocs[0] || null;
                const isApproved = !!approvedFile;

                return (
                  <Col xs={24} lg={12} key={doc.id}>
                    <Card
                      size="small"
                      style={{
                        borderRadius: 20,
                        border: '1px solid #e5e7eb',
                        background: '#fafafa',
                        height: '100%',
                      }}
                      styles={{ body: { padding: 18 } }}
                    >
                      {isApproved && latestFile ? (
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 16,
                            flexWrap: 'wrap',
                            minHeight: 110,
                          }}
                        >
                          <Space align="start">
                            <FileTextOutlined style={{ marginTop: 4 }} />
                            <div style={{ display: 'grid', gap: 8 }}>
                              <Text strong style={{ fontSize: 18 }}>
                                {doc.name}
                              </Text>

                              <Space wrap>
                                <Text strong>{latestFile.originalName}</Text>
                                {getDocStatusTag(latestFile.status)}
                              </Space>
                            </div>
                          </Space>

                          <Button
                            icon={<DownloadOutlined />}
                            onClick={() => window.open(resolveAssetUrl(latestFile.url), '_blank')}
                            style={{ borderRadius: 12 }}
                          >
                            Abrir arquivo
                          </Button>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: 16 }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: 16,
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Space align="start">
                                <FileTextOutlined style={{ marginTop: 4 }} />
                                <div style={{ display: 'grid', gap: 8 }}>
                                  <Text strong style={{ fontSize: 18 }}>
                                    {doc.name}
                                  </Text>

                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {isRequired ? (
                                      <Tag color="red" style={{ borderRadius: 999 }}>
                                        Obrigatório
                                      </Tag>
                                    ) : (
                                      <Tag color="purple" style={{ borderRadius: 999 }}>
                                        Adicional
                                      </Tag>
                                    )}

                                    {doc.allowMultiple ? (
                                      <Tag color="blue" style={{ borderRadius: 999 }}>
                                        Múltiplos arquivos
                                      </Tag>
                                    ) : (
                                      <Tag style={{ borderRadius: 999 }}>Arquivo único</Tag>
                                    )}

                                    <Tag style={{ borderRadius: 999 }}>
                                      Enviados: {currentDocs.length}
                                    </Tag>
                                  </div>

                                  {doc.description ? (
                                    <Text type="secondary">{doc.description}</Text>
                                  ) : null}
                                </div>
                              </Space>
                            </div>

                            <Upload
                              beforeUpload={(file) => {
                                uploadDocMut.mutate({ documentTypeId: doc.id, file });
                                return false;
                              }}
                              showUploadList={false}
                              multiple={doc.allowMultiple}
                            >
                              <Button
                                type="primary"
                                icon={<UploadOutlined />}
                                loading={uploadDocMut.isPending}
                                style={{ borderRadius: 12 }}
                              >
                                {doc.allowMultiple ? 'Adicionar arquivos' : 'Enviar documento'}
                              </Button>
                            </Upload>
                          </div>

                          <div>
                            {doc.templateUrl ? (
                              <Button
                                icon={<DownloadOutlined />}
                                onClick={() =>
                                  window.open(resolveAssetUrl(doc.templateUrl), '_blank')
                                }
                                style={{ borderRadius: 12 }}
                              >
                                Baixar modelo
                              </Button>
                            ) : (
                              <Text type="secondary">Sem modelo disponível</Text>
                            )}
                          </div>

                          {currentDocs.length > 0 ? (
                            <div style={{ display: 'grid', gap: 10 }}>
                              {currentDocs.map((file) => (
                                <Card
                                  key={file.id}
                                  size="small"
                                  style={{
                                    borderRadius: 14,
                                    border: '1px solid #e5e7eb',
                                    background: '#fff',
                                  }}
                                  styles={{ body: { padding: 14 } }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      gap: 12,
                                      flexWrap: 'wrap',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <div style={{ display: 'grid', gap: 6 }}>
                                      <Space wrap>
                                        <Text strong>{file.originalName}</Text>
                                        {getDocStatusTag(file.status)}
                                      </Space>

                                      <Text type="secondary">
                                        Tamanho: {fileSize(file.size)}
                                      </Text>
                                    </div>

                                    <Button
                                      icon={<DownloadOutlined />}
                                      onClick={() =>
                                        window.open(resolveAssetUrl(file.url), '_blank')
                                      }
                                      style={{ borderRadius: 12 }}
                                    >
                                      Abrir arquivo
                                    </Button>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <Alert
                              type={isRequired ? 'warning' : 'info'}
                              showIcon
                              icon={isRequired ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
                              message={
                                isRequired
                                  ? 'Documento obrigatório ainda não enviado'
                                  : 'Nenhum arquivo adicional enviado'
                              }
                              style={{ borderRadius: 12 }}
                            />
                          )}
                        </div>
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Card>

        <Modal
          open={openVehicleDocsModal}
          onCancel={() => setOpenVehicleDocsModal(false)}
          footer={[
            <Button key="ok" type="primary" onClick={() => setOpenVehicleDocsModal(false)}>
              Entendi
            </Button>,
          ]}
          title="Documentos e fotos do veículo"
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message="Você selecionou veículo"
              description="Para concluir a homologação, envie os documentos e fotos do veículo na seção de documentos para homologação."
              style={{ borderRadius: 12 }}
            />
            <Space wrap>
              <Tag>Documento do veículo 1</Tag>
              <Tag>Documento do veículo 2</Tag>
              <Tag>Foto do veículo 1</Tag>
              <Tag>Foto do veículo 2</Tag>
            </Space>
          </Space>
        </Modal>

        <Modal
          open={openWorkshopDocsModal}
          onCancel={() => setOpenWorkshopDocsModal(false)}
          footer={[
            <Button key="ok" type="primary" onClick={() => setOpenWorkshopDocsModal(false)}>
              Entendi
            </Button>,
          ]}
          title="Fotos da oficina / posto autorizado"
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message="Você selecionou posto autorizado / oficina"
              description="Para concluir a homologação, envie as fotos da fachada e do interior na seção de documentos para homologação."
              style={{ borderRadius: 12 }}
            />
            <Space wrap>
              <Tag>Foto da fachada</Tag>
              <Tag>Foto do interior</Tag>
            </Space>
          </Space>
        </Modal>
      </div>
    </>
  );
}