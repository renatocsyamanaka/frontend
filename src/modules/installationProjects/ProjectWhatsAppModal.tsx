import { Modal, Form, Input, Button, Space } from 'antd';

export default function ProjectWhatsAppModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (v: { name: string; link: string }) => void;
  initial: { name: string; link: string };
}) {
  const [form] = Form.useForm();

  return (
    <Modal
      open={open}
      title="WhatsApp do Projeto"
      okText="Salvar"
      cancelText="Cancelar"
      onCancel={onClose}
      onOk={async () => {
        const values = await form.validateFields();
        onSave({ name: values.name || '', link: values.link || '' });
      }}
      destroyOnClose
    >
      <Form layout="vertical" form={form} initialValues={{ name: initial.name, link: initial.link }}>
        <Form.Item name="name" label="Nome do grupo">
          <Input placeholder="Ex: Projeto - Cliente X - Jan/2026" />
        </Form.Item>

        <Form.Item name="link" label="Link do grupo (opcional)">
          <Input placeholder="https://chat.whatsapp.com/..." />
        </Form.Item>

        <Space>
          <Button
            onClick={() => {
              const name = form.getFieldValue('name') || 'Projeto';
              const msg = encodeURIComponent(`Criar grupo WhatsApp: ${name}`);
              window.open(`https://wa.me/?text=${msg}`, '_blank');
            }}
          >
            Abrir WhatsApp (mensagem)
          </Button>

          <Button
            onClick={() => {
              const link = form.getFieldValue('link');
              if (link) window.open(link, '_blank');
            }}
          >
            Abrir link do grupo
          </Button>
        </Space>
      </Form>
    </Modal>
  );
}
