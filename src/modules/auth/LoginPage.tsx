import { Button, Card, Form, Input, Typography, message, Grid } from 'antd';
import { MailOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { useAuth } from './AuthProvider';

export function LoginPage() {
  const { login } = useAuth();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md; // md+ = PC/tablet grande

  const onFinish = async (values: any) => {
    try {
      await login(values.email, values.password);
      message.success('Bem-vindo!');
      location.href = '/';
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Falha no login');
    }
  };

  // cores da sua marca
  const brandStart = '#1e40af'; // azul escuro
  const brandEnd = '#22d3ee';   // ciano

  return (
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
          maxWidth: 420, // 👈 mantém exatamente o “tamanho do PC”
          borderRadius: isMobile ? 14 : 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(6px)',
        }}
        bodyStyle={{
          padding: isMobile ? 20 : 28,
        }}
      >
        {/* Header com logo */}
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
        </Form>
      </Card>
    </div>
  );
}
