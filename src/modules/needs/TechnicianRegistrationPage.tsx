import { useEffect, useMemo } from 'react';
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

  const { data, isLoading, refetch } = useQuery<OpenResponse>({
    queryKey: ['public-tech-registration', token],
    queryFn: async () => (await api.get(`/need-homologation/public/${token}`)).data,
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (data?.registration) {
      form.setFieldsValue({
        ...data.registration,
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
    }
  }, [data, form]);

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

  const requiredDocuments = useMemo(
    () => (data?.documentTypes || []).filter((d) => d.isRequired),
    [data]
  );

  const additionalDocumentsTypes = useMemo(
    () => (data?.documentTypes || []).filter((d) => !d.isRequired),
    [data]
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
    { key: 'cpf', label: 'CPF' },
    { key: 'birthDate', label: 'Data de nascimento' },
    { key: 'motherName', label: 'Nome da mãe' },
    { key: 'address', label: 'Endereço' },
    { key: 'district', label: 'Bairro' },
    { key: 'city', label: 'Cidade' },
    { key: 'state', label: 'UF' },
    { key: 'zipCode', label: 'CEP' },
    { key: 'phone', label: 'Telefone' },
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

  const additionalLimit = data?.config?.extraLimit || 5;

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: 24,
        display: 'grid',
        gap: 16,
      }}
    >
      <Card
        loading={isLoading}
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
                percent={requiredCount ? Math.round((approvedRequiredCount / requiredCount) * 100) : 0}
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
        loading={isLoading}
        title="Dados do cadastro"
        style={pageCardStyle()}
        styles={{ body: { padding: 22 } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => saveDraftMut.mutate(values)}
        >
          {sectionTitle('Dados do técnico')}

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="fullName" label="Nome completo" rules={[{ required: true }]}>
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="rg" label="RG">
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="cpf" label="CPF" rules={[{ required: true }]}>
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="birthDate" label="Data de nascimento" rules={[{ required: true }]}>
                <Input type="date" style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={16}>
              <Form.Item name="motherName" label="Nome da mãe" rules={[{ required: true }]}>
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="company" label="Empresa">
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="cnpj" label="CNPJ">
                <Input style={{ borderRadius: 12 }} />
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
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="phone" label="Telefone" rules={[{ required: true }]}>
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="email" label="E-mail">
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
                <Input style={{ borderRadius: 12 }} />
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
                <Input style={{ borderRadius: 12 }} />
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
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="witnessEmail" label="E-mail">
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="witnessPhone" label="Telefone">
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>
          </Row>

          {sectionTitle('Dados bancários')}

          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item name="bankName" label="Banco">
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="bankCode" label="Código do banco">
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item name="agency" label="Agência">
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={2}>
              <Form.Item name="agencyDigit" label="Dígito">
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item name="accountNumber" label="Conta">
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={2}>
              <Form.Item name="accountDigit" label="Dígito">
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>
          </Row>

          {sectionTitle('Segmentos e atendimento')}

          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item name="hasCltEmployees" valuePropName="checked" style={{ marginBottom: 0 }}>
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
        loading={isLoading}
        title="Documentos para homologação"
        style={pageCardStyle()}
        styles={{ body: { padding: 22 } }}
      >
        {(data?.documentTypes || []).length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Nenhum documento configurado para esta homologação"
          />
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {(data?.documentTypes || []).map((doc) => {
              const currentDocs = documentsByType.get(doc.id) || [];
              const isRequired = doc.isRequired;

              return (
                <Card
                  key={doc.id}
                  size="small"
                  style={{
                    borderRadius: 20,
                    border: '1px solid #e5e7eb',
                    background: '#fafafa',
                  }}
                  styles={{ body: { padding: 18 } }}
                >
                  <div style={{ display: 'grid', gap: 14 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ display: 'grid', gap: 8, flex: 1 }}>
                        <Space align="start">
                          <FileTextOutlined style={{ marginTop: 3 }} />
                          <div>
                            <Text strong>{doc.name}</Text>

                            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                          </div>
                        </Space>

                        {doc.description ? (
                          <Text type="secondary">{doc.description}</Text>
                        ) : null}
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

                    <Space wrap>
                      {doc.templateUrl ? (
                        <Button
                          icon={<DownloadOutlined />}
                          onClick={() => window.open(resolveAssetUrl(doc.templateUrl), '_blank')}
                          style={{ borderRadius: 12 }}
                        >
                          Baixar modelo
                        </Button>
                      ) : (
                        <Text type="secondary">Sem modelo disponível</Text>
                      )}
                    </Space>

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
                                onClick={() => window.open(resolveAssetUrl(file.url), '_blank')}
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
                </Card>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}