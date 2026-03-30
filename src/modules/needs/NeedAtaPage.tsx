import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Grid,
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
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  SaveOutlined,
  SendOutlined,
  UploadOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

type AtaDocumentStatus = 'SENT' | 'APPROVED' | 'REJECTED';

type AtaRegistrationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ADJUSTMENT_REQUIRED'
  | 'APPROVED'
  | 'REJECTED';

type NeedSummary = {
  need: {
    id: number;
    requestedName?: string | null;
    requestedLocationText?: string | null;
    providerName?: string | null;
    homologationStatus?: string | null;
    techType?: { id: number; name: string } | null;
  };
  registration: {
    id: number;
    status: AtaRegistrationStatus;
    fullName?: string | null;
    cpf?: string | null;
    rg?: string | null;
    address?: string | null;
    email?: string | null;
    reviewNotes?: string | null;
    submittedAt?: string | null;
    reviewedAt?: string | null;
  };
  document?: {
    id: number;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
    status: AtaDocumentStatus;
    notes?: string | null;
    createdAt?: string;
    reviewedAt?: string | null;
  } | null;
  documents?: Array<{
    id: number;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
    status: AtaDocumentStatus;
    notes?: string | null;
    createdAt?: string;
    reviewedAt?: string | null;
  }>;
  progress: {
    profileComplete: boolean;
    documentSent: boolean;
    documentApproved: boolean;
  };
};

function pageCardStyle(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: '1px solid #e5e7eb',
    boxShadow: '0 8px 28px rgba(15, 23, 42, 0.05)',
  };
}

function resolveAssetUrl(url?: string | null) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;

  const base = String(api.defaults.baseURL || '').replace(/\/api\/?$/, '');
  return `${base}${String(url).startsWith('/') ? '' : '/'}${url}`;
}

function fmtDateTime(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('pt-BR');
}

function formatFileSize(bytes?: number | null) {
  const size = Number(bytes || 0);
  if (!size) return '0 KB';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function getTag(status?: string | null) {
  const map: Record<string, { color: string; label: string }> = {
    DRAFT: { color: 'default', label: 'Rascunho' },
    SUBMITTED: { color: 'blue', label: 'Enviado' },
    UNDER_REVIEW: { color: 'gold', label: 'Em análise' },
    ADJUSTMENT_REQUIRED: { color: 'orange', label: 'Ajuste solicitado' },
    APPROVED: { color: 'green', label: 'Aprovado' },
    REJECTED: { color: 'red', label: 'Reprovado' },
    SENT: { color: 'blue', label: 'Enviado' },
  };

  const info = map[String(status || '')] || { color: 'default', label: status || '—' };
  return (
    <Tag color={info.color} style={{ borderRadius: 999 }}>
      {info.label}
    </Tag>
  );
}

export default function NeedAtaPage() {
  const { id } = useParams();
  const needId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [form] = Form.useForm();
  const [reviewNotes, setReviewNotes] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const validNeedId = Number.isFinite(needId) && needId > 0;

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery<NeedSummary>({
    queryKey: ['need-ata', needId],
    queryFn: async () => {
      const response = await api.get(`/need-ata/needs/${needId}`);
      return response.data;
    },
    enabled: validNeedId,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data?.registration) {
      form.setFieldsValue({
        fullName: data.registration.fullName || '',
        cpf: data.registration.cpf || '',
        rg: data.registration.rg || '',
        address: data.registration.address || '',
        email: data.registration.email || '',
      });
      setReviewNotes(data.registration.reviewNotes || '');
    }
  }, [data, form]);

  const saveProfile = useMutation({
    mutationFn: async (payload: {
      fullName: string;
      cpf: string;
      rg: string;
      address: string;
      email: string;
    }) => (await api.put(`/need-ata/needs/${needId}/profile`, payload)).data,
    onSuccess: async () => {
      message.success('Cadastro ATA salvo com sucesso');
      await qc.invalidateQueries({ queryKey: ['need-ata', needId] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao salvar cadastro ATA');
    },
  });

  const uploadDocument = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);

      return (
        await api.post(`/need-ata/needs/${needId}/document`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data;
    },
    onSuccess: async () => {
      message.success('Ficha cadastral enviada com sucesso');
      await qc.invalidateQueries({ queryKey: ['need-ata', needId] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao enviar ficha cadastral');
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (documentId: number) =>
      (await api.delete(`/need-ata/needs/${needId}/document/${documentId}`)).data,
    onSuccess: async () => {
      message.success('Documento removido');
      await qc.invalidateQueries({ queryKey: ['need-ata', needId] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao remover documento');
    },
  });

  const submitAta = useMutation({
    mutationFn: async () => (await api.post(`/need-ata/needs/${needId}/submit`)).data,
    onSuccess: async () => {
      message.success('Cadastro ATA enviado para análise');
      await qc.invalidateQueries({ queryKey: ['need-ata', needId] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao enviar cadastro ATA');
    },
  });

  const reviewAta = useMutation({
    mutationFn: async (payload: {
      status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ADJUSTMENT_REQUIRED';
      reviewNotes?: string | null;
    }) => (await api.post(`/need-ata/needs/${needId}/review`, payload)).data,
    onSuccess: async () => {
      message.success('Revisão ATA atualizada');
      await qc.invalidateQueries({ queryKey: ['need-ata', needId] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao revisar cadastro ATA');
    },
  });

  const progressPercent = useMemo(() => {
    if (!data) return 0;
    const profile = data.progress.profileComplete ? 50 : 0;
    const document = data.progress.documentSent ? 50 : 0;
    return profile + document;
  }, [data]);

  const requiredMissing = useMemo(() => {
    if (!data?.registration) return [];
    const reg = data.registration;

    const fields = [
      { key: 'fullName', label: 'Nome' },
      { key: 'cpf', label: 'CPF' },
      { key: 'rg', label: 'RG' },
      { key: 'address', label: 'Endereço' },
      { key: 'email', label: 'E-mail' },
    ] as const;

    return fields.filter((field) => !String(reg[field.key] || '').trim());
  }, [data]);

  if (!validNeedId) {
    return <Empty description="ID da solicitação ATA inválido" />;
  }

  if (isPending) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
        <Empty description="Carregando cadastro ATA..." />
      </div>
    );
  }

  if (isError) {
    const err = error as any;
    return (
      <Alert
        type="error"
        showIcon
        message="Erro ao carregar cadastro ATA"
        description={err?.response?.data?.error || err?.message || 'Falha desconhecida'}
        style={{ borderRadius: 16 }}
      />
    );
  }

  if (!data || !data.need || !data.registration) {
    return <Empty description="Cadastro ATA não encontrado" />;
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card
        style={pageCardStyle()}
        styles={{
          body: {
            padding: isMobile ? 16 : 22,
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

              {getTag(data.registration.status)}
              <Tag color="green" style={{ borderRadius: 999 }}>
                ATA simplificado
              </Tag>
            </Space>

            <Title level={3} style={{ margin: 0 }}>
              Cadastro ATA
            </Title>

            <Text type="secondary">
              {data.need.requestedName || data.need.providerName || 'Prestador'} • fluxo interno
              simplificado
            </Text>
          </Space>

          <Space wrap>
            <Button onClick={() => refetch()} style={{ borderRadius: 12 }}>
              Atualizar
            </Button>
          </Space>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card style={pageCardStyle()} styles={{ body: { padding: 18 } }}>
            <Text type="secondary">Progresso geral</Text>
            <Title level={3} style={{ marginTop: 8 }}>
              {progressPercent}%
            </Title>
            <Progress percent={progressPercent} />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card style={pageCardStyle()} styles={{ body: { padding: 18 } }}>
            <Text type="secondary">Cadastro básico</Text>
            <Title level={3} style={{ marginTop: 8 }}>
              {data.progress.profileComplete ? 'Completo' : 'Pendente'}
            </Title>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card style={pageCardStyle()} styles={{ body: { padding: 18 } }}>
            <Text type="secondary">Ficha cadastral</Text>
            <Title level={3} style={{ marginTop: 8 }}>
              {data.progress.documentSent ? 'Enviada' : 'Não enviada'}
            </Title>
          </Card>
        </Col>
      </Row>

      {requiredMissing.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="Existem campos obrigatórios faltando"
          description={
            <Space wrap>
              {requiredMissing.map((item) => (
                <Tag key={item.key} color="orange" style={{ borderRadius: 999 }}>
                  {item.label}
                </Tag>
              ))}
            </Space>
          }
          style={{ borderRadius: 16 }}
        />
      )}

      <Card title="Dados do ATA" style={pageCardStyle()} styles={{ body: { padding: 20 } }}>
        <Form form={form} layout="vertical" onFinish={(values) => saveProfile.mutate(values)}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="fullName" label="Nome" rules={[{ required: true }]}>
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="cpf" label="CPF" rules={[{ required: true }]}>
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="rg" label="RG" rules={[{ required: true }]}>
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={16}>
              <Form.Item name="address" label="Endereço" rules={[{ required: true }]}>
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label="E-mail"
                rules={[{ required: true, type: 'email' }]}
              >
                <Input style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>
          </Row>

          <Space wrap>
            <Button
              icon={<SaveOutlined />}
              htmlType="submit"
              loading={saveProfile.isPending}
              style={{ borderRadius: 12 }}
            >
              Salvar
            </Button>

            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={submitAta.isPending}
              onClick={() => submitAta.mutate()}
              style={{ borderRadius: 12 }}
            >
              Enviar para análise
            </Button>
          </Space>
        </Form>
      </Card>

      <Card title="Ficha cadastral ATA" style={pageCardStyle()} styles={{ body: { padding: 20 } }}>
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="Ficha cadastral ATA"
            description="Documento único obrigatório do ATA"
            style={{ borderRadius: 14 }}
          />

          <Upload
            showUploadList={false}
            beforeUpload={(file) => {
              uploadDocument.mutate(file);
              return false;
            }}
          >
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploadDocument.isPending}
              style={{ borderRadius: 12 }}
            >
              Enviar ficha cadastral
            </Button>
          </Upload>

          {!data.document ? (
            <Empty description="Nenhum documento enviado ainda" />
          ) : (
            <Card
              size="small"
              style={{ borderRadius: 18, border: '1px solid #eef2f7' }}
              styles={{ body: { padding: 16 } }}
            >
              <Space
                style={{ width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}
                wrap
              >
                <Space align="start">
                  <FileTextOutlined style={{ fontSize: 18, marginTop: 4 }} />
                  <div style={{ display: 'grid', gap: 4 }}>
                    <Space wrap>
                      <Text strong>{data.document.originalName}</Text>
                      {getTag(data.document.status)}
                    </Space>
                    <Text type="secondary">Tamanho: {formatFileSize(data.document.size)}</Text>
                    <Text type="secondary">
                      Enviado em: {fmtDateTime(data.document.createdAt)}
                    </Text>
                    {data.document.reviewedAt ? (
                      <Text type="secondary">
                        Revisado em: {fmtDateTime(data.document.reviewedAt)}
                      </Text>
                    ) : null}
                  </div>
                </Space>

                <Space wrap>
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => setPreviewOpen(true)}
                    style={{ borderRadius: 12 }}
                  >
                    Visualizar
                  </Button>

                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => window.open(resolveAssetUrl(data.document?.url), '_blank')}
                    style={{ borderRadius: 12 }}
                  >
                    Download
                  </Button>

                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={deleteDocument.isPending}
                    onClick={() => deleteDocument.mutate(data.document.id)}
                    style={{ borderRadius: 12 }}
                  >
                    Remover
                  </Button>
                </Space>
              </Space>
            </Card>
          )}
        </Space>
      </Card>

      <Card title="Revisão interna" style={pageCardStyle()} styles={{ body: { padding: 20 } }}>
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Status atual">
              {getTag(data.registration.status)}
            </Descriptions.Item>
            <Descriptions.Item label="Parecer atual">
              {data.registration.reviewNotes || '—'}
            </Descriptions.Item>
          </Descriptions>

          <Input.TextArea
            rows={4}
            placeholder="Observações da análise"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            style={{ borderRadius: 12 }}
          />

          <Space wrap>
            <Button
              icon={<CheckCircleOutlined />}
              onClick={() =>
                reviewAta.mutate({
                  status: 'UNDER_REVIEW',
                  reviewNotes,
                })
              }
              loading={reviewAta.isPending}
              style={{ borderRadius: 12 }}
            >
              Em análise
            </Button>

            <Button
              icon={<CheckOutlined />}
              type="primary"
              onClick={() =>
                reviewAta.mutate({
                  status: 'APPROVED',
                  reviewNotes,
                })
              }
              loading={reviewAta.isPending}
              style={{ borderRadius: 12 }}
            >
              Aprovar
            </Button>

            <Button
              icon={<CloseOutlined />}
              onClick={() =>
                reviewAta.mutate({
                  status: 'ADJUSTMENT_REQUIRED',
                  reviewNotes,
                })
              }
              loading={reviewAta.isPending}
              style={{ borderRadius: 12 }}
            >
              Solicitar ajuste
            </Button>

            <Button
              danger
              icon={<CloseOutlined />}
              onClick={() =>
                reviewAta.mutate({
                  status: 'REJECTED',
                  reviewNotes,
                })
              }
              loading={reviewAta.isPending}
              style={{ borderRadius: 12 }}
            >
              Reprovar
            </Button>
          </Space>
        </Space>
      </Card>

      <Modal
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        title={data.document?.originalName || 'Visualizar documento'}
        width={1000}
        destroyOnHidden
      >
        {data.document ? (
          String(data.document.mimeType || '').includes('pdf') ? (
            <iframe
              src={resolveAssetUrl(data.document.url)}
              title={data.document.originalName}
              style={{ width: '100%', height: '75vh', border: 0, borderRadius: 12 }}
            />
          ) : String(data.document.mimeType || '').includes('image') ? (
            <div style={{ textAlign: 'center' }}>
              <img
                src={resolveAssetUrl(data.document.url)}
                alt={data.document.originalName}
                style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 12 }}
              />
            </div>
          ) : (
            <Empty
              description={
                <Space direction="vertical">
                  <Text>Pré-visualização não disponível para este formato.</Text>
                  <Button onClick={() => window.open(resolveAssetUrl(data.document?.url), '_blank')}>
                    Abrir arquivo
                  </Button>
                </Space>
              }
            />
          )
        ) : null}
      </Modal>
    </div>
  );
}