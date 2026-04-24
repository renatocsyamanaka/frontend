import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  IdcardOutlined,
  MessageOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
  StopOutlined,
  UserOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../../lib/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

function normalizeResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatPhone(phone) {
  const digits = onlyDigits(phone);

  if (!digits) return '-';

  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }

  if (digits.length === 12) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return String(phone || '-');
}

function getDisplayPhone(item) {
  const metadata = item?.metadata || {};

  const phone =
    metadata.userPhone ||
    metadata.phone ||
    metadata.whatsappPhone ||
    item?.phone ||
    '';

  const providerChatId = item?.providerChatId || '';

  if (providerChatId.includes('@lid')) {
    return {
      label: phone ? formatPhone(phone) : 'Número não identificado',
      extra: providerChatId,
      isLid: true,
    };
  }

  if (providerChatId.includes('@c.us')) {
    return {
      label: formatPhone(providerChatId),
      extra: providerChatId,
      isLid: false,
    };
  }

  return {
    label: formatPhone(phone),
    extra: providerChatId || null,
    isLid: false,
  };
}

function formatDateTime(value) {
  if (!value) return '-';
  return dayjs(value).format('DD/MM/YYYY HH:mm');
}

function getStatusMeta(status) {
  const map = {
    OPEN: {
      label: 'Aberta',
      color: 'green',
      icon: <CheckCircleOutlined />,
    },
    WAITING_NOTE: {
      label: 'Aguardando nota',
      color: 'gold',
      icon: <ClockCircleOutlined />,
    },
    WAITING_CONFIRMATION: {
      label: 'Aguardando confirmação',
      color: 'blue',
      icon: <ClockCircleOutlined />,
    },
    CLOSED: {
      label: 'Encerrada',
      color: 'default',
      icon: <StopOutlined />,
    },
    TRANSFERRED: {
      label: 'Transferida',
      color: 'purple',
      icon: <MessageOutlined />,
    },
  };

  return (
    map[status] || {
      label: status || 'Sem status',
      color: 'default',
      icon: <MessageOutlined />,
    }
  );
}

function getInitials(name, fallback = '?') {
  const text = String(name || '').trim();
  if (!text) return fallback;

  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getMessageRole(msg) {
  const direction = String(msg?.direction || '').toUpperCase();
  const senderType = String(msg?.senderType || '').toUpperCase();

  if (direction === 'IN') {
    return {
      label: 'Cliente',
      emoji: '👤',
      bg: '#1f2937',
      align: 'flex-start',
      borderRadius: '16px 16px 16px 4px',
    };
  }

  if (senderType === 'BOT') {
    return {
      label: 'Bot',
      emoji: '🤖',
      bg: 'linear-gradient(135deg, #1677ff 0%, #2563eb 100%)',
      align: 'flex-end',
      borderRadius: '16px 16px 4px 16px',
    };
  }

  return {
    label: 'Atendente',
    emoji: '👨‍💻',
    bg: 'linear-gradient(135deg, #059669 0%, #16a34a 100%)',
    align: 'flex-end',
    borderRadius: '16px 16px 4px 16px',
  };
}

export default function WhatsappConversasPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const bottomRef = useRef(null);

  const getCurrentUserName = () => {
    return (
      currentUser?.name ||
      currentUser?.nome ||
      currentUser?.fullName ||
      currentUser?.nomeCompleto ||
      'Atendente'
    );
  };

  const loadCurrentUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setCurrentUser(data?.user || data?.data || data || null);
    } catch (err) {
      console.warn('Erro ao carregar usuário:', err);
    }
  };

  const conversationsQuery = useQuery({
    queryKey: ['whatsapp-conversations'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/conversations');
      return normalizeResponse(res.data);
    },
    staleTime: 15000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const rows = useMemo(() => {
    const raw = conversationsQuery.data || [];
    const term = search.trim().toLowerCase();

    return raw.filter((item) => {
      const phoneInfo = getDisplayPhone(item);
      const matchesStatus = status === 'ALL' ? true : item.status === status;

      const haystack = [
        item.contactName,
        item.phone,
        item.providerChatId,
        phoneInfo.label,
        phoneInfo.extra,
        item.lastMessage,
        item.protocol,
        item.provider,
        item?.metadata?.userName,
        item?.metadata?.userEmail,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && (!term || haystack.includes(term));
    });
  }, [conversationsQuery.data, search, status]);

  const counters = useMemo(() => {
    const source = conversationsQuery.data || [];

    return {
      total: source.length,
      open: source.filter((item) => item.status === 'OPEN').length,
      waitingNote: source.filter((item) => item.status === 'WAITING_NOTE').length,
      waitingConfirmation: source.filter((item) => item.status === 'WAITING_CONFIRMATION').length,
      closed: source.filter((item) => item.status === 'CLOSED').length,
    };
  }, [conversationsQuery.data]);

  const loadConversation = async (conversationId, showLoading = true) => {
    if (!conversationId) return;

    if (showLoading) setDetailLoading(true);

    try {
      const { data } = await api.get(`/whatsapp/conversations/${conversationId}`);
      setSelectedConversation(data);

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Erro ao carregar conversa:', err);
      message.error(err?.response?.data?.error || 'Não foi possível carregar a conversa.');
    } finally {
      if (showLoading) setDetailLoading(false);
    }
  };

  const openConversationModal = async (conversationId) => {
    setSelectedConversationId(conversationId);
    setDetailOpen(true);
    await loadConversation(conversationId, true);
  };

  const handleCloseModal = () => {
    setDetailOpen(false);
    setSelectedConversationId(null);
    setSelectedConversation(null);
    setMessageText('');
  };

  const handleSend = async () => {
    const trimmed = String(messageText || '').trim();
    if (!trimmed || !selectedConversationId) return;

    setSending(true);

    try {
      await api.post(`/whatsapp/conversations/${selectedConversationId}/send`, {
        message: trimmed,
        senderName: getCurrentUserName(),
      });

      setMessageText('');
      await loadConversation(selectedConversationId, false);
      await conversationsQuery.refetch();

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      message.error(err?.response?.data?.error || 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!detailOpen || !selectedConversationId) return;

    const interval = setInterval(() => {
      loadConversation(selectedConversationId, false);
      conversationsQuery.refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [detailOpen, selectedConversationId]);

  const columns = [
    {
      title: 'Contato',
      key: 'contact',
      width: 360,
      sorter: (a, b) =>
        String(a.contactName || a.phone || '').localeCompare(
          String(b.contactName || b.phone || ''),
          'pt-BR',
          { sensitivity: 'base' }
        ),
      render: (_, record) => {
        const phoneInfo = getDisplayPhone(record);
        const meta = record?.metadata || {};
        const name = meta.userName || record.contactName || 'Contato WhatsApp';

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <Badge dot={record.status === 'OPEN'} color="#22c55e">
              <Avatar
                size={46}
                style={{
                  background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                  flexShrink: 0,
                  fontWeight: 800,
                }}
              >
                {getInitials(name, '?')}
              </Avatar>
            </Badge>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 800,
                  color: '#0f172a',
                  maxWidth: 230,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={name}
              >
                {name}
              </div>

              <Space size={4} wrap>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <PhoneOutlined /> {phoneInfo.label}
                </Text>

                {phoneInfo.isLid && (
                  <Tooltip title={phoneInfo.extra}>
                    <Tag color="blue" style={{ borderRadius: 999, marginInlineEnd: 0 }}>
                      ID WAHA
                    </Tag>
                  </Tooltip>
                )}
              </Space>

              {meta.userEmail && (
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {meta.userEmail}
                  </Text>
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Última mensagem',
      dataIndex: 'lastMessage',
      key: 'lastMessage',
      ellipsis: true,
      render: (value) => (
        <Text style={{ fontSize: 13, color: '#334155' }}>
          {value || '-'}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 210,
      render: (value) => {
        const meta = getStatusMeta(value);
        return (
          <Tag
            color={meta.color}
            style={{
              borderRadius: 999,
              paddingInline: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 700,
            }}
          >
            {meta.icon}
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: 'Mensagens',
      dataIndex: 'messagesCount',
      key: 'messagesCount',
      width: 120,
      align: 'center',
      render: (value) => (
        <Tag color="geekblue" style={{ borderRadius: 999, fontWeight: 800 }}>
          {value || 0}
        </Tag>
      ),
    },
    {
      title: 'Última interação',
      dataIndex: 'lastInteractionAt',
      key: 'lastInteractionAt',
      width: 170,
      render: (value) => formatDateTime(value),
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Tooltip title="Ver conversa">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => openConversationModal(record.id)}
            style={{ borderRadius: 12 }}
          />
        </Tooltip>
      ),
    },
  ];

  const selectedPhoneInfo = getDisplayPhone(selectedConversation);
  const selectedName =
    selectedConversation?.metadata?.userName ||
    selectedConversation?.contactName ||
    'Contato WhatsApp';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 4 }}>
      <Card
        variant={false}
        style={{
          borderRadius: 24,
          background: 'linear-gradient(135deg, #064e3b 0%, #16a34a 58%, #22c55e 100%)',
          boxShadow: '0 18px 32px rgba(15, 23, 42, 0.12)',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: 22 } }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
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
              Atendimento automatizado
            </div>

            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              Conversas do WhatsApp
            </Title>

            <Text style={{ color: 'rgba(255,255,255,0.88)' }}>
              Visualize atendimentos, acompanhe o bot e consulte o histórico completo.
            </Text>
          </Col>

          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => conversationsQuery.refetch()}
              loading={conversationsQuery.isFetching}
              style={{ borderRadius: 12, minWidth: 120, fontWeight: 700 }}
            >
              Atualizar
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {[
          ['Total', counters.total, '#0f172a', '#fff'],
          ['Abertas', counters.open, '#166534', '#f0fdf4'],
          ['Aguardando nota', counters.waitingNote, '#a16207', '#fffbeb'],
          ['Aguardando confirmação', counters.waitingConfirmation, '#1d4ed8', '#eff6ff'],
          ['Encerradas', counters.closed, '#334155', '#f8fafc'],
        ].map(([label, value, color, bg]) => (
          <Col xs={24} md={label === 'Total' ? 4 : 5} key={label}>
            <Card
              size="small"
              style={{
                borderRadius: 18,
                background: bg,
                boxShadow: '0 10px 20px rgba(15,23,42,0.05)',
              }}
            >
              <Text type="secondary">{label}</Text>
              <div style={{ fontSize: 28, fontWeight: 900, color, marginTop: 4 }}>
                {value}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        variant={false}
        style={{
          borderRadius: 24,
          boxShadow: '0 14px 30px rgba(15,23,42,0.06)',
        }}
        styles={{ body: { padding: 18 } }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(220px, 280px)',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Input
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            placeholder="Pesquisar por nome, telefone, ID WhatsApp, mensagem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ borderRadius: 14 }}
          />

          <Select
            size="large"
            value={status}
            onChange={setStatus}
            style={{ width: '100%' }}
            options={[
              { label: 'Todos os status', value: 'ALL' },
              { label: 'Aberta', value: 'OPEN' },
              { label: 'Aguardando nota', value: 'WAITING_NOTE' },
              { label: 'Aguardando confirmação', value: 'WAITING_CONFIRMATION' },
              { label: 'Encerrada', value: 'CLOSED' },
              { label: 'Transferida', value: 'TRANSFERRED' },
            ]}
          />
        </div>

        <Table
          rowKey="id"
          loading={conversationsQuery.isLoading || conversationsQuery.isFetching}
          dataSource={rows}
          columns={columns}
          size="small"
          scroll={{ x: 1180 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total) => `${total} conversa(s)`,
          }}
          locale={{
            emptyText: 'Nenhuma conversa encontrada.',
          }}
        />
      </Card>

      <Modal
        open={detailOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={1080}
        destroyOnHidden
        title={null}
        styles={{
          body: {
            padding: 0,
            height: '82vh',
            overflow: 'hidden',
          },
        }}
      >
        <Card
          style={{ height: '100%', borderRadius: 0 }}
          styles={{
            body: {
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              padding: 0,
              overflow: 'hidden',
            },
          }}
          title={
            <Row justify="space-between" align="middle" gutter={[12, 12]}>
              <Col flex="auto">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar
                    size={48}
                    style={{
                      background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                      flexShrink: 0,
                      fontWeight: 900,
                    }}
                  >
                    {getInitials(selectedName)}
                  </Avatar>

                  <div style={{ minWidth: 0 }}>
                    <Title level={5} style={{ margin: 0 }}>
                      {selectedName}
                    </Title>

                    <Space size={8} wrap>
                      <Text type="secondary">
                        <PhoneOutlined /> {selectedPhoneInfo.label}
                      </Text>

                      {selectedPhoneInfo.isLid && (
                        <Tooltip title={selectedPhoneInfo.extra}>
                          <Tag color="blue" style={{ borderRadius: 999 }}>
                            <IdcardOutlined /> ID WAHA
                          </Tag>
                        </Tooltip>
                      )}
                    </Space>

                    {selectedPhoneInfo.extra && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Chat ID: {selectedPhoneInfo.extra}
                        </Text>
                      </div>
                    )}
                  </div>
                </div>
              </Col>

              <Col>
                <Space>
                  <Tag
                    color={getStatusMeta(selectedConversation?.status).color}
                    style={{ borderRadius: 999, paddingInline: 10, fontWeight: 700 }}
                  >
                    {getStatusMeta(selectedConversation?.status).label}
                  </Tag>

                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => loadConversation(selectedConversationId, true)}
                    loading={detailLoading}
                    style={{ borderRadius: 10 }}
                  >
                    Atualizar
                  </Button>
                </Space>
              </Col>
            </Row>
          }
        >
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 18,
              background:
                'radial-gradient(circle at top left, rgba(34,197,94,0.16), transparent 32%), #0f172a',
            }}
          >
            <Spin spinning={detailLoading}>
              {!selectedConversation?.messages?.length ? (
                <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
                  <Empty description="Nenhuma mensagem ainda" />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedConversation.messages.map((msg) => {
                    const role = getMessageRole(msg);
                    const bubbleText = msg.text || msg.content || msg.body || '-';

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: role.align,
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '74%',
                            padding: '10px 13px',
                            borderRadius: role.borderRadius,
                            background: role.bg,
                            color: '#fff',
                            boxShadow: '0 8px 18px rgba(0,0,0,0.18)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              marginBottom: 5,
                              opacity: 0.92,
                            }}
                          >
                            {role.emoji} {role.label}
                          </div>

                          <Text style={{ color: '#fff' }}>{bubbleText}</Text>

                          <div
                            style={{
                              fontSize: 10,
                              marginTop: 7,
                              opacity: 0.75,
                              textAlign: 'right',
                            }}
                          >
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleString('pt-BR') : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div ref={bottomRef} />
                </div>
              )}
            </Spin>
          </div>

          <div style={{ padding: 12, borderTop: '1px solid #e5e7eb', background: '#fff' }}>
            <Row gutter={8} align="bottom">
              <Col flex="auto">
                <TextArea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={2}
                  placeholder={`Digite uma mensagem como ${getCurrentUserName()}...`}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  style={{ borderRadius: 12 }}
                />
              </Col>

              <Col>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={sending}
                  onClick={handleSend}
                  style={{
                    borderRadius: 12,
                    height: 74,
                    fontWeight: 800,
                    minWidth: 92,
                  }}
                >
                  Enviar
                </Button>
              </Col>
            </Row>

            <div style={{ marginTop: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Mensagem será enviada identificada como:{' '}
                <strong>{getCurrentUserName()}</strong>
              </Text>
            </div>
          </div>
        </Card>
      </Modal>
    </div>
  );
}