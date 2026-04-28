import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Col,
  Empty,
  Image,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { api } from '../../lib/api';

const { Title, Text } = Typography;

type SystemFile = {
  name: string;
  url: string;
  path: string;
  folder: string;
  size: number;
  createdAt?: string;
};

const FOLDER_LABELS: Record<string, string> = {
  avatars: 'Avatares',
  news: 'Notícias',
  'dashboard-banners': 'Banners do Dashboard',
  'daily-report-logos': 'Logos de Projetos de Instalações',
  homologation: 'Homologação',
  needs: 'Demandas',
  media: 'Mídia Geral',
};

function normalizeFolder(folder?: string) {
  if (!folder) return 'media';
  return String(folder).split('/')[0];
}

function folderLabel(folder?: string) {
  const key = normalizeFolder(folder);
  return FOLDER_LABELS[key] || key;
}

function absUrl(url?: string | null) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const origin = apiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');

  return `${origin}/${String(url).replace(/^\/+/, '')}`;
}

function formatSize(size?: number) {
  if (!size) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isPdf(file?: SystemFile | null) {
  return String(file?.name || file?.url || '').toLowerCase().endsWith('.pdf');
}

function isImage(file?: SystemFile | null) {
  return /\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(
    String(file?.name || file?.url || '')
  );
}

export default function MediaManagerPage() {
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState<string | undefined>();
  const [preview, setPreview] = useState<SystemFile | null>(null);

  const filesQuery = useQuery<SystemFile[]>({
    queryKey: ['system-files'],
    queryFn: async () => {
      const res = await api.get('/files');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const deleteFile = useMutation({
    mutationFn: async (filePath: string) => {
      const res = await api.post('/files/delete', { filePath });
      return res.data;
    },
    onSuccess: async () => {
      message.success('Arquivo excluído com sucesso');
      setPreview(null);
      await qc.invalidateQueries({ queryKey: ['system-files'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Erro ao excluir arquivo');
    },
  });

  const folders = useMemo(() => {
    const set = new Set(
      (filesQuery.data || [])
        .map((file) => normalizeFolder(file.folder))
        .filter(Boolean)
    );

    return Array.from(set).sort((a, b) =>
      folderLabel(a).localeCompare(folderLabel(b), 'pt-BR')
    );
  }, [filesQuery.data]);

  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (filesQuery.data || []).filter((file) => {
      const normalized = normalizeFolder(file.folder);

      if (folder && normalized !== folder) return false;

      if (!q) return true;

      return [file.name, folderLabel(file.folder), file.url]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [filesQuery.data, search, folder]);

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(absUrl(url));
    message.success('URL copiada');
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 24,
          background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
          boxShadow: '0 18px 34px rgba(15,23,42,0.14)',
        }}
        styles={{ body: { padding: 22 } }}
      >
        <Space
          align="start"
          style={{ width: '100%', justifyContent: 'space-between' }}
          wrap
        >
          <div>
            <Tag color="blue" style={{ borderRadius: 999 }}>
              <FileImageOutlined /> Administração
            </Tag>

            <Title level={2} style={{ color: '#fff', margin: '10px 0 4px' }}>
              Gerenciador de Arquivos
            </Title>

            <Text style={{ color: 'rgba(255,255,255,0.78)' }}>
              Visualize imagens, PDFs e arquivos das pastas do portal.
            </Text>
          </div>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => filesQuery.refetch()}
            loading={filesQuery.isFetching}
          >
            Atualizar
          </Button>
        </Space>
      </Card>

      <Card bordered={false} style={{ borderRadius: 20 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={14}>
            <Input
              allowClear
              size="large"
              prefix={<SearchOutlined />}
              placeholder="Buscar por nome, categoria ou URL"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>

          <Col xs={24} md={7}>
            <Select
              allowClear
              size="large"
              style={{ width: '100%' }}
              placeholder="Filtrar por categoria"
              value={folder}
              onChange={setFolder}
              options={folders.map((f) => ({
                value: f,
                label: folderLabel(f),
              }))}
            />
          </Col>

          <Col xs={24} md={3}>
            <Button
              block
              size="large"
              onClick={() => {
                setSearch('');
                setFolder(undefined);
              }}
            >
              Limpar
            </Button>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ borderRadius: 20 }}>
        {filesQuery.isLoading ? (
          <Text>Carregando arquivos...</Text>
        ) : !filteredFiles.length ? (
          <Empty description="Nenhum arquivo encontrado" />
        ) : (
          <Row gutter={[16, 16]}>
            {filteredFiles.map((file) => (
              <Col xs={24} sm={12} md={8} lg={6} xl={4} key={file.path}>
                <Card
                  hoverable
                  style={{
                    borderRadius: 18,
                    overflow: 'hidden',
                    height: '100%',
                  }}
                  styles={{
                    body: {
                      padding: 12,
                      display: 'grid',
                      gap: 8,
                    },
                  }}
                  cover={
                    <div
                      style={{
                        height: 140,
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {isPdf(file) ? (
                        <div style={{ textAlign: 'center', color: '#ef4444' }}>
                          <FilePdfOutlined style={{ fontSize: 42 }} />
                          <div style={{ marginTop: 8, fontWeight: 700 }}>
                            PDF
                          </div>
                        </div>
                      ) : isImage(file) ? (
                        <Image
                          src={absUrl(file.url)}
                          alt={file.name}
                          height={140}
                          width="100%"
                          style={{ objectFit: 'cover' }}
                          preview={false}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', color: '#64748b' }}>
                          <FileImageOutlined style={{ fontSize: 36 }} />
                          <div style={{ marginTop: 8 }}>Arquivo</div>
                        </div>
                      )}
                    </div>
                  }
                >
                  <Text strong ellipsis={{ tooltip: file.name }}>
                    {file.name}
                  </Text>

                  <Space wrap size={[4, 4]}>
                    <Tag>{folderLabel(file.folder)}</Tag>
                    <Tag color="blue">{formatSize(file.size)}</Tag>
                  </Space>

                  <Space wrap>
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => setPreview(file)}
                    >
                      Ver
                    </Button>

                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyUrl(file.url)}
                    >
                      URL
                    </Button>

                    <Popconfirm
                      title="Excluir arquivo"
                      description="Tem certeza que deseja excluir este arquivo?"
                      okText="Sim, excluir"
                      cancelText="Cancelar"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => deleteFile.mutate(file.path)}
                    >
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        loading={deleteFile.isPending}
                      />
                    </Popconfirm>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      <Modal
        open={!!preview}
        onCancel={() => setPreview(null)}
        title={preview?.name}
        footer={
          preview ? (
            <Space wrap>
              <Button icon={<CopyOutlined />} onClick={() => copyUrl(preview.url)}>
                Copiar URL
              </Button>

              <Popconfirm
                title="Excluir arquivo"
                description="Tem certeza que deseja excluir este arquivo?"
                okText="Sim, excluir"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
                onConfirm={() => deleteFile.mutate(preview.path)}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleteFile.isPending}
                >
                  Excluir
                </Button>
              </Popconfirm>

              <Button onClick={() => setPreview(null)}>Fechar</Button>
            </Space>
          ) : null
        }
        width={900}
        centered
      >
        {preview && (
          <div style={{ display: 'grid', gap: 12 }}>
            {isPdf(preview) ? (
              <iframe
                src={absUrl(preview.url)}
                title={preview.name}
                style={{
                  width: '100%',
                  height: 620,
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                }}
              />
            ) : isImage(preview) ? (
              <Image
                src={absUrl(preview.url)}
                alt={preview.name}
                style={{ maxHeight: 520, objectFit: 'contain' }}
              />
            ) : (
              <Card>
                <Text>
                  Pré-visualização indisponível para este tipo de arquivo.
                </Text>
              </Card>
            )}

            <Card size="small">
              <p>
                <b>Categoria:</b> {folderLabel(preview.folder)}
              </p>
              <p>
                <b>Pasta técnica:</b> {preview.folder}
              </p>
              <p>
                <b>Tamanho:</b> {formatSize(preview.size)}
              </p>
              <p>
                <b>URL:</b> {absUrl(preview.url)}
              </p>
              <p>
                <b>Caminho:</b> {preview.path}
              </p>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}