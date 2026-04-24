import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Modal,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  DisconnectOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  WhatsAppOutlined,
  LinkOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

const { Title, Text } = Typography;

function unwrap(data) {
  if (data && typeof data === 'object' && 'data' in data && !('mimetype' in data)) {
    return data.data;
  }
  return data;
}

function getStatusMeta(status) {
  const normalized = String(status || '').toUpperCase();

  if (['WORKING', 'CONNECTED', 'READY'].includes(normalized)) {
    return {
      label: 'Conectado',
      color: 'green',
      icon: <CheckCircleOutlined />,
      bg: '#f0fdf4',
      border: '#bbf7d0',
      text: '#166534',
    };
  }

  if (['STARTING', 'SCAN_QR_CODE', 'QR', 'OPENING'].includes(normalized)) {
    return {
      label: 'Aguardando leitura do QR Code',
      color: 'gold',
      icon: <QrcodeOutlined />,
      bg: '#fffbeb',
      border: '#fde68a',
      text: '#a16207',
    };
  }

  if (['FAILED', 'STOPPED', 'DISCONNECTED', 'NOT_FOUND'].includes(normalized)) {
    return {
      label: 'Desconectado',
      color: 'red',
      icon: <CloseCircleOutlined />,
      bg: '#fef2f2',
      border: '#fecaca',
      text: '#991b1b',
    };
  }

  return {
    label: status || 'Desconhecido',
    color: 'default',
    icon: <SyncOutlined spin />,
    bg: '#f8fafc',
    border: '#e2e8f0',
    text: '#334155',
  };
}

export default function WhatsappConnectionPage() {
  const [qrOpen, setQrOpen] = useState(false);
  const [qrLoadedOnce, setQrLoadedOnce] = useState(false);

  const statusQuery = useQuery({
    queryKey: ['waha-session-status'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/session/status');
      return unwrap(res.data);
    },
    refetchOnWindowFocus: false,
    staleTime: 5000,
    retry: false,
  });

  const qrQuery = useQuery({
    queryKey: ['waha-session-qr'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/session/qr');
      return unwrap(res.data);
    },
    enabled: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: false,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/whatsapp/session/connect');
      return unwrap(res.data);
    },
    onSuccess: async () => {
      message.success('Sessão iniciada com sucesso.');
      await statusQuery.refetch();
      setQrOpen(true);
    },
    onError: (err) => {
      console.error('CONNECT ERROR:', err);
      message.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Falha ao iniciar conexão.'
      );
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/whatsapp/session/logout');
      return unwrap(res.data);
    },
    onSuccess: async () => {
      message.success('Sessão desconectada com sucesso.');
      setQrOpen(false);
      setQrLoadedOnce(false);
      await statusQuery.refetch();
    },
    onError: (err) => {
      message.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Falha ao desconectar.'
      );
    },
  });

  const recreateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/whatsapp/session/restart');
      return unwrap(res.data);
    },
    onSuccess: async () => {
      message.success('Sessão reiniciada com sucesso.');
      setQrLoadedOnce(false);
      await statusQuery.refetch();
      setQrOpen(true);
    },
    onError: (err) => {
      console.error('RESTART ERROR:', err);
      message.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Falha ao reiniciar sessão.'
      );
    },
  });

  const sessionStatus = useMemo(() => {
    const raw =
      statusQuery.data?.status ||
      statusQuery.data?.state ||
      statusQuery.data?.session?.status ||
      'NOT_FOUND';

    return String(raw).toUpperCase();
  }, [statusQuery.data]);

  const statusMeta = getStatusMeta(sessionStatus);

  const qrImage = useMemo(() => {
    const raw =
      qrQuery.data?.data ||
      qrQuery.data?.qr ||
      qrQuery.data?.base64 ||
      qrQuery.data?.value ||
      '';

    const mimetype = qrQuery.data?.mimetype || 'image/png';

    if (!raw) return '';

    if (String(raw).startsWith('data:image')) return raw;

    return `data:${mimetype};base64,${raw}`;
  }, [qrQuery.data]);

  const isConnected = ['WORKING', 'CONNECTED', 'READY'].includes(sessionStatus);
  const isQrPending = ['STARTING', 'SCAN_QR_CODE', 'QR', 'OPENING'].includes(sessionStatus);

  useEffect(() => {
    if (!qrOpen) {
      setQrLoadedOnce(false);
      return;
    }

    statusQuery.refetch();

    if (!qrLoadedOnce) {
      qrQuery.refetch();
    }
  }, [qrOpen]);

  useEffect(() => {
    if (qrImage) {
      setQrLoadedOnce(true);
    }
  }, [qrImage]);

  const handleManualRefresh = async () => {
    await statusQuery.refetch();

    if (qrOpen && !isConnected) {
      await qrQuery.refetch();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card
        variant={false}
        style={{
          borderRadius: 24,
          background: 'linear-gradient(135deg, #14532d 0%, #16a34a 55%, #22c55e 100%)',
          boxShadow: '0 18px 32px rgba(15,23,42,0.12)',
        }}
        styles={{ body: { padding: 20 } }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.16)',
                color: '#dcfce7',
                borderRadius: 999,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 10,
              }}
            >
              <WhatsAppOutlined />
              Integração WAHA
            </div>

            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              Conexão do WhatsApp
            </Title>

            <Text style={{ color: 'rgba(255,255,255,0.86)' }}>
              Conecte o número, leia o QR Code e acompanhe o status da sessão.
            </Text>
          </div>

          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleManualRefresh}
              loading={statusQuery.isFetching || qrQuery.isFetching}
              style={{ borderRadius: 12, fontWeight: 700 }}
            >
              Atualizar
            </Button>

            {!isConnected && !isQrPending && (
              <Button
                type="primary"
                icon={<LinkOutlined />}
                loading={connectMutation.isPending}
                onClick={() => connectMutation.mutate()}
                style={{ borderRadius: 12, fontWeight: 700 }}
              >
                Conectar WhatsApp
              </Button>
            )}

            {isConnected && (
              <Button
                danger
                icon={<DisconnectOutlined />}
                loading={disconnectMutation.isPending}
                onClick={() => {
                  Modal.confirm({
                    title: 'Desconectar WhatsApp',
                    content: 'Deseja realmente desconectar a sessão atual?',
                    okText: 'Desconectar',
                    cancelText: 'Cancelar',
                    okButtonProps: { danger: true },
                    onOk: async () => {
                      await disconnectMutation.mutateAsync();
                    },
                  });
                }}
                style={{ borderRadius: 12, fontWeight: 700 }}
              >
                Desconectar
              </Button>
            )}
          </Space>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card
            size="small"
            style={{
              borderRadius: 18,
              background: statusMeta.bg,
              borderColor: statusMeta.border,
            }}
          >
            <Text type="secondary">Status da sessão</Text>
            <div style={{ marginTop: 8 }}>
              <Tag
                color={statusMeta.color}
                style={{
                  borderRadius: 999,
                  paddingInline: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                }}
              >
                {statusMeta.icon}
                {statusMeta.label}
              </Tag>
            </div>
            <div style={{ marginTop: 10, color: statusMeta.text, fontWeight: 800, fontSize: 24 }}>
              {sessionStatus}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            size="small"
            style={{
              borderRadius: 18,
              boxShadow: '0 10px 20px rgba(15,23,42,0.05)',
            }}
          >
            <Text type="secondary">Ação principal</Text>
            <div style={{ marginTop: 14 }}>
              <Button
                block
                icon={<QrcodeOutlined />}
                onClick={() => setQrOpen(true)}
                style={{ borderRadius: 12, fontWeight: 700 }}
              >
                Abrir QR Code
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            size="small"
            style={{
              borderRadius: 18,
              boxShadow: '0 10px 20px rgba(15,23,42,0.05)',
            }}
          >
            <Text type="secondary">Sessão</Text>
            <div style={{ marginTop: 14 }}>
              <Button
                block
                icon={<ReloadOutlined />}
                loading={recreateMutation.isPending}
                onClick={() => recreateMutation.mutate()}
                style={{ borderRadius: 12, fontWeight: 700 }}
              >
                Reiniciar sessão
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        open={qrOpen}
        onCancel={() => setQrOpen(false)}
        footer={null}
        width={520}
        destroyOnHidden
        title="Conectar WhatsApp"
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div
            style={{
              borderRadius: 18,
              padding: 18,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              textAlign: 'center',
            }}
          >
            {isConnected ? (
              <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
                <CheckCircleOutlined style={{ fontSize: 48, color: '#16a34a' }} />
                <Title level={4} style={{ margin: 0 }}>
                  WhatsApp conectado
                </Title>
                <Text type="secondary">
                  A sessão já está ativa e pronta para receber mensagens.
                </Text>
              </div>
            ) : qrQuery.isLoading || qrQuery.isFetching ? (
              <div style={{ padding: '32px 0', display: 'grid', gap: 12, justifyItems: 'center' }}>
                <Spin size="large" />
                <Text>Buscando QR Code...</Text>
              </div>
            ) : qrImage ? (
              <div style={{ display: 'grid', gap: 14, justifyItems: 'center' }}>
                <img
                  src={qrImage}
                  alt="QR Code do WhatsApp"
                  style={{
                    width: 280,
                    maxWidth: '100%',
                    borderRadius: 16,
                    background: '#fff',
                    padding: 12,
                    border: '1px solid #e2e8f0',
                  }}
                />
                <Text type="secondary">
                  Abra o WhatsApp no celular, vá em aparelhos conectados e leia o QR Code.
                </Text>
              </div>
            ) : isQrPending ? (
              <div style={{ padding: '20px 0', display: 'grid', gap: 12, justifyItems: 'center' }}>
                <QrcodeOutlined style={{ fontSize: 42, color: '#d97706' }} />
                <Text strong>Aguardando leitura do QR Code</Text>
                <Text type="secondary">
                  O QR já foi solicitado. Leia com o celular e use “Atualizar” só se ele expirar.
                </Text>
              </div>
            ) : (
              <div style={{ padding: '20px 0', display: 'grid', gap: 12, justifyItems: 'center' }}>
                <CloseCircleOutlined style={{ fontSize: 42, color: '#dc2626' }} />
                <Text strong>QR Code não disponível no momento</Text>
                <Text type="secondary">
                  Clique em conectar ou reiniciar sessão e tente novamente.
                </Text>
                <Space wrap>
                  {!isQrPending && (
                    <Button
                      type="primary"
                      icon={<LinkOutlined />}
                      loading={connectMutation.isPending}
                      onClick={() => connectMutation.mutate()}
                      style={{ borderRadius: 12 }}
                    >
                      Conectar
                    </Button>
                  )}
                  <Button
                    icon={<ReloadOutlined />}
                    loading={recreateMutation.isPending}
                    onClick={() => recreateMutation.mutate()}
                    style={{ borderRadius: 12 }}
                  >
                    Reiniciar sessão
                  </Button>
                </Space>
              </div>
            )}
          </div>

          <Space wrap style={{ justifyContent: 'center' }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleManualRefresh}
              loading={statusQuery.isFetching || qrQuery.isFetching}
              style={{ borderRadius: 12 }}
            >
              Atualizar
            </Button>

            {isConnected && (
              <Button
                danger
                icon={<DisconnectOutlined />}
                loading={disconnectMutation.isPending}
                onClick={() => {
                  Modal.confirm({
                    title: 'Desconectar WhatsApp',
                    content: 'Deseja realmente desconectar a sessão atual?',
                    okText: 'Desconectar',
                    cancelText: 'Cancelar',
                    okButtonProps: { danger: true },
                    onOk: async () => {
                      await disconnectMutation.mutateAsync();
                      setQrOpen(false);
                    },
                  });
                }}
                style={{ borderRadius: 12 }}
              >
                Desconectar
              </Button>
            )}
          </Space>
        </div>
      </Modal>
    </div>
  );
}