import { Button, DatePicker, Form, Input, InputNumber, Switch } from 'antd';
import { api } from '../../lib/api';

export function TimeOffPage() {
  const [form] = Form.useForm();

  return (
    <div>
      <h2>Folgas/Ausências</h2>
      <Form layout="vertical" form={form} onFinish={(v)=>{
        const payload = {
          userId: v.userId,
          startDate: v.range[0].format('YYYY-MM-DD'),
          endDate: v.range[1].format('YYYY-MM-DD'),
          type: v.type ?? 'OUTROS',
          usesBankHours: v.usesBankHours ?? false,
          minutesDeducted: v.minutesDeducted || 0,
          notes: v.notes
        };
        api.post('/timeoff', payload);
        form.resetFields();
      }} initialValues={{ userId:1 }}>
        <Form.Item name="userId" label="User ID" rules={[{required:true}]}><InputNumber min={1}/></Form.Item>
        <Form.Item name="range" label="Período" rules={[{required:true}]}><DatePicker.RangePicker format="YYYY-MM-DD"/></Form.Item>
        <Form.Item name="type" label="Tipo"><Input placeholder="BANCO_HORAS / FERIAS / ATESTADO / OUTROS"/></Form.Item>
        <Form.Item name="usesBankHours" label="Usa banco de horas?" valuePropName="checked"><Switch/></Form.Item>
        <Form.Item name="minutesDeducted" label="Minutos a debitar (se usar banco)"><InputNumber/></Form.Item>
        <Form.Item name="notes" label="Observações"><Input.TextArea rows={3}/></Form.Item>
        <Button type="primary" htmlType="submit">Solicitar</Button>
      </Form>
    </div>
  );
}