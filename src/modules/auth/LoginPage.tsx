import React, { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Typography,
  message,
  Grid,
  Divider,
  Space,
  Modal,
  Select,
  Upload,
  Row,
  Col,
} from 'antd';
import {
  MailOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  ToolOutlined,
  UserAddOutlined,
  UploadOutlined,
  UserOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { useAuth } from './AuthProvider';
import { api } from '../../lib/api';
import { MaskedInput } from 'antd-mask-input';

const onlyDigits = (v?: string) => String(v || '').replace(/\D/g, '');

const phoneMask = (value?: string) => {
  const digits = onlyDigits(value);
  return digits.length > 10 ? '(00) 00000-0000' : '(00) 0000-0000';
};

const ALLOWED_DOMAINS = [
  'omnilink.com.br',
  'showtecnologia.com.br',
  'noriomomoi.com.br',
];

const validateCorporateEmail = (_: any, value: string) => {
  if (!value) return Promise.reject(new Error('Informe seu e-mail'));

  const parts = String(value).toLowerCase().trim().split('@');
  const domain = parts[1];

  if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
    return Promise.reject(
      new Error(
        'Use um e-mail corporativo válido: @omnilink.com.br, @showtecnologia.com.br ou @noriomomoi.com.br'
      )
    );
  }

  return Promise.resolve();
};

export function LoginPage() {
  const { login } = useAuth();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [signupOpen, setSignupOpen] = useState(false);
  const [signupForm] = Form.useForm();
  const [signupAvatarFile, setSignupAvatarFile] = useState<File | null>(null);
  const [sendingSignup, setSendingSignup] = useState(false);
  const signupPhone = Form.useWatch('phone', signupForm);

  const onFinish = async (values: any) => {
    try {
      await login(values.email, values.password);
      message.success('Bem-vindo!');
      location.href = '/';
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Falha no login');
    }
  };

  const onSubmitSignup = async (values: any) => {
    try {
      setSendingSignup(true);

      const fd = new FormData();
      fd.append('fullName', values.fullName);
      fd.append('email', values.email);
      fd.append('password', values.password);
      fd.append('sex', values.sex || '');
      fd.append('phone', values.phone || '');

      if (signupAvatarFile) {
        fd.append('avatar', signupAvatarFile);
      }

      await api.post('/user-registration-requests', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      message.success('Solicitação enviada com sucesso. Aguarde a aprovação do gestor.');
      setSignupOpen(false);
      signupForm.resetFields();
      setSignupAvatarFile(null);
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Não foi possível enviar sua solicitação');
    } finally {
      setSendingSignup(false);
    }
  };

  const brandStart = '#1e40af';
  const brandEnd = '#22d3ee';

  return (
    <>
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: isMobile ? 16 : 24,
          background: `radial-gradient(1200px 600px at 10% 10%, ${brandEnd}1a, transparent 60%),
                       radial-gradient(1000px 500px at 90% 80%, ${brandStart}1a, transparent 55%),
                       linear-gradient(135deg, ${brandStart} 0%, ${brandEnd} 100%)`,
        }}
      >
        <Card
          style={{
            width: '100%',
            maxWidth: 420,
            borderRadius: isMobile ? 14 : 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(6px)',
          }}
          styles={{
            body: {
              padding: isMobile ? 20 : 28,
            },
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <img
              src="/logo.png"
              alt="Omnilink"
              style={{
                height: isMobile ? '78px' : '96px',
                maxWidth: '85%',
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto',
              }}
            />
            <Typography.Text type="secondary">Acesse sua conta</Typography.Text>
          </div>

          <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
            <Form.Item
              name="email"
              label="E-mail"
              rules={[{ required: true, type: 'email', message: 'Informe um e-mail válido' }]}
            >
              <Input
                size="large"
                placeholder="seuemail@empresa.com"
                prefix={<MailOutlined />}
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Senha"
              rules={[{ required: true, message: 'Informe sua senha' }]}
            >
              <Input.Password
                size="large"
                placeholder="••••••••"
                autoComplete="current-password"
                prefix={<LockOutlined />}
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                style={{
                  border: 'none',
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${brandStart}, ${brandEnd})`,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                }}
              >
                Entrar
              </Button>

              <Button
                size="large"
                block
                icon={<UserAddOutlined />}
                onClick={() => setSignupOpen(true)}
                style={{ borderRadius: 10 }}
              >
                Cadastre-se
              </Button>
            </Space>

            <Divider style={{ margin: '18px 0 14px' }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                ou
              </Typography.Text>
            </Divider>

            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Button
                size="large"
                block
                icon={<ToolOutlined />}
                onClick={() => {
                  location.href = '/solicitar-peca';
                }}
                style={{ borderRadius: 10 }}
              >
                Acessar portal de peças
              </Button>

              <Typography.Text
                type="secondary"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  fontSize: 12,
                }}
              >
                Faça uma solicitação ou acompanhe um pedido sem precisar entrar no sistema.
              </Typography.Text>
            </Space>
          </Form>
        </Card>
      </div>

      <Modal
        title="Pré-cadastro"
        open={signupOpen}
        onCancel={() => {
          setSignupOpen(false);
          signupForm.resetFields();
          setSignupAvatarFile(null);
        }}
        onOk={() => signupForm.submit()}
        okText="Enviar solicitação"
        cancelText="Cancelar"
        confirmLoading={sendingSignup}
        destroyOnClose
        width={isMobile ? '100%' : 760}
        style={isMobile ? { top: 0, padding: 0 } : undefined}
      >
        <div style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">
            Preencha seus dados. Sua solicitação será enviada para aprovação. Cargo e gestor serão definidos no momento da aprovação.
          </Typography.Text>
        </div>

        <Form layout="vertical" form={signupForm} onFinish={onSubmitSignup}>
          <Form.Item
            name="fullName"
            label="Nome completo"
            rules={[{ required: true, message: 'Informe seu nome completo' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Digite seu nome completo" />
          </Form.Item>

          <Form.Item
            name="email"
            label="E-mail corporativo"
            rules={[
              { required: true, message: 'Informe seu e-mail' },
              { type: 'email', message: 'Informe um e-mail válido' },
              { validator: validateCorporateEmail },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="seunome@omnilink.com.br" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Senha"
            rules={[
              { required: true, message: 'Informe uma senha' },
              { min: 6, message: 'A senha deve ter no mínimo 6 caracteres' },
            ]}
          >
            <Input.Password
              placeholder="Crie uma senha"
              prefix={<LockOutlined />}
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="sex" label="Sexo">
                <Select
                  allowClear
                  placeholder="Selecione"
                  options={[
                    { value: 'M', label: 'Masculino' },
                    { value: 'F', label: 'Feminino' },
                    { value: 'O', label: 'Outro' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="phone"
                label="Telefone"
                rules={[{ required: true, message: 'Informe seu telefone' }]}
              >
                <MaskedInput
                  mask={phoneMask(signupPhone)}
                  prefix={<PhoneOutlined />}
                  placeholder="(11) 99999-9999"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Foto (opcional)">
            <Upload
              accept="image/jpeg,image/png,image/webp"
              maxCount={1}
              beforeUpload={(file) => {
                setSignupAvatarFile(file);
                return false;
              }}
              onRemove={() => setSignupAvatarFile(null)}
              listType="picture"
            >
              <Button icon={<UploadOutlined />}>Selecionar foto</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}