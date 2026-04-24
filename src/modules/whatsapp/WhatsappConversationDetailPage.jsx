import React, { useEffect, useRef, useState } from 'react';
import {
  Card,
  Typography,
  Input,
  Button,
  Spin,
  Empty,
  Row,
  Col,
  Tag,
  Avatar,
  message,
  Space,
  Tooltip,
} from 'antd';
import {
  SendOutlined,
  UserOutlined,
  ReloadOutlined,
  PhoneOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';

const { Text, Title } = Typography;
const { TextArea } = Input;

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

function getInitials(name) {
  const text = String(name || '').trim();
  if (!text) return '?';

  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getContactInfo(conversation) {
  const metadata = conversation?.metadata || {};

  const name =
    metadata.userName ||
    conversation?.contactName ||
    'Contato WhatsApp';

  const avatar =
    metadata.avatarUrl ||
    metadata.photoUrl ||
    metadata.userAvatar ||
    null;

  const realPhone =
    metadata.userPhone ||
    metadata.phone ||
    metadata.whatsappPhone ||
    conversation?.phone ||
    '';

  const providerChatId = conversation?.providerChatId || '';
  const isLid = providerChatId.includes('@lid');

  return {
    name,
    avatar,
    phoneLabel: realPhone ? formatPhone(realPhone) : 'Número não identificado',
    providerChatId,
    isLid,
  };
}

function getStatusLabel(status) {
  const map = {
    OPEN: 'Aberta',
    WAITING_NOTE: 'Aguardando nota',
    WAITING_CONFIRMATION: 'Aguardando confirmação',
    TRANSFERRED: 'Transferida',
    CLOSED: 'Encerrada',
  };

  return map[status] || status || 'Sem status';
}

function getStatusColor(status) {
  const normalized = String(status || '').toUpperCase();

  if (normalized === 'OPEN') return 'green';
  if (normalized === 'WAITING_NOTE') return 'gold';
  if (normalized === 'WAITING_CONFIRMATION') return 'blue';
  if (normalized === 'TRANSFERRED') return 'purple';
  if (normalized === 'CLOSED') return 'default';

  return 'default';
}

function getMessageAuthor(msg) {
  const senderType = String(msg?.senderType || '').toUpperCase();

  if (senderType === 'BOT') return 'Bot';
  if (senderType === 'HUMAN') return 'Atendente';
  if (senderType === 'USER') return 'Cliente';

  return '';
}

export default function WhatsappConversationDetailPage() {
  const { id } = useParams();
  const conversationId = id;

  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const bottomRef = useRef(null);

  const contact = getContactInfo(conversation);

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

      const user =
        data?.user ||
        data?.data ||
        data ||
        null;

      setCurrentUser(user);
    } catch (err) {
      console.warn('Não foi possível carregar usuário logado:', err);
    }
  };

  const loadConversation = async (showLoading = true) => {
    if (!conversationId) return;

    if (showLoading) setLoading(true);

    try {
      const { data } = await api.get(`/whatsapp/conversations/${conversationId}`);
      setConversation(data);

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Erro ao carregar conversa:', err);
      message.error(
        err?.response?.data?.error || 'Não foi possível carregar a conversa.'
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!conversationId) return;

    loadConversation(true);

    const interval = setInterval(() => {
      loadConversation(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [conversationId]);

  const handleSend = async () => {
    const trimmed = String(messageText || '').trim();
    if (!trimmed || !conversationId) return;

    const senderName = getCurrentUserName();

    const finalMessage = `*${senderName}:*\n${trimmed}`;

    setSending(true);

    try {
      await api.post(`/whatsapp/conversations/${conversationId}/send`, {
        message: finalMessage,
      });

      setMessageText('');
      await loadConversation(false);

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      message.error(
        err?.response?.data?.error || 'Não foi possível enviar a mensagem.'
      );
    } finally {
      setSending(false);
    }
  };

  if (!conversationId) {
    return <Empty description="Selecione uma conversa" />;
  }

  return (
    <Card
      style={{
        height: 'calc(100vh - 180px)',
        borderRadius: 24,
        boxShadow: '0 14px 30px rgba(15,23,42,0.06)',
        overflow: 'hidden',
      }}
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
                src={contact.avatar || undefined}
                icon={!contact.avatar ? <UserOutlined /> : undefined}
                style={{
                  background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                  flexShrink: 0,
                  fontWeight: 900,
                }}
              >
                {!contact.avatar ? getInitials(contact.name) : null}
              </Avatar>

              <div style={{ minWidth: 0 }}>
                <Title level={5} style={{ margin: 0 }}>
                  {contact.name}
                </Title>

                <Space size={8} wrap>
                  <Text type="secondary">
                    <PhoneOutlined /> {contact.phoneLabel}
                  </Text>

                  {contact.isLid && (
                    <Tooltip title={contact.providerChatId}>
                      <Tag color="blue" style={{ borderRadius: 999 }}>
                        <IdcardOutlined /> ID WAHA
                      </Tag>
                    </Tooltip>
                  )}
                </Space>

                {contact.providerChatId && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Chat ID: {contact.providerChatId}
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </Col>

          <Col>
            <Space>
              <Tag
                color={getStatusColor(conversation?.status)}
                style={{
                  borderRadius: 999,
                  paddingInline: 10,
                  fontWeight: 700,
                }}
              >
                {getStatusLabel(conversation?.status)}
              </Tag>

              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadConversation(true)}
                loading={loading}
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
            'radial-gradient(circle at top left, rgba(34,197,94,0.14), transparent 34%), #0f172a',
        }}
      >
        <Spin spinning={loading}>
          {!conversation?.messages?.length ? (
            <div
              style={{
                height: '100%',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Empty description="Nenhuma mensagem ainda" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {conversation.messages.map((msg) => {
                const isMe = String(msg.direction || '').toUpperCase() === 'OUT';
                const bubbleText =
                  msg.text ||
                  msg.content ||
                  msg.body ||
                  '-';

                const author = getMessageAuthor(msg);

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '74%',
                        padding: '10px 13px',
                        borderRadius: isMe
                          ? '16px 16px 4px 16px'
                          : '16px 16px 16px 4px',
                        background: isMe
                          ? 'linear-gradient(135deg, #1677ff 0%, #2563eb 100%)'
                          : '#1f2937',
                        color: '#fff',
                        boxShadow: '0 8px 18px rgba(0,0,0,0.18)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      <Text style={{ color: '#fff' }}>{bubbleText}</Text>

                      <div
                        style={{
                          fontSize: 10,
                          marginTop: 7,
                          opacity: 0.75,
                          textAlign: 'right',
                        }}
                      >
                        {author ? `${author} • ` : ''}
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleString('pt-BR')
                          : ''}
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

      <div
        style={{
          padding: 12,
          borderTop: '1px solid #e5e7eb',
          background: '#fff',
        }}
      >
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
                minWidth: 96,
                fontWeight: 800,
              }}
            >
              Enviar
            </Button>
          </Col>
        </Row>

        <div style={{ marginTop: 6 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Mensagem será enviada identificada como: <strong>{getCurrentUserName()}</strong>
          </Text>
        </div>
      </div>
    </Card>
  );
}