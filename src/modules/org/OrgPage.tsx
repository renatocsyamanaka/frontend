import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Card, Empty, Image, Segmented, Spin, Typography } from 'antd';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import { api } from '../../lib/api';
import './org.css';

const { Title, Text } = Typography;

type OrgNode = {
  id: number;
  name: string;
  role?: string | null;
  roleLevel?: number | null;
  managerId?: number | null;
  avatarUrl?: string | null;
  sectors?: string[] | null;
  children?: OrgNode[];
};

type SectorFilter =
  | 'OPERACOES'
  | 'LOGISTICA'
  | 'SISTEMAS'
  | 'ATENDIMENTO';

function normalizeText(value?: string | null) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeRole(role?: string | null) {
  return normalizeText(role);
}

function normalizeSectors(value?: string[] | string | null) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return [...new Set(value.map((s) => normalizeText(s)).filter(Boolean))];
  }

  return [
    ...new Set(
      String(value)
        .split(',')
        .map((s) => normalizeText(s))
        .filter(Boolean)
    ),
  ];
}

function absImage(url?: string | null) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;

  const base = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const path = String(url).startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

function hasSector(node: OrgNode, sector: SectorFilter) {
  return normalizeSectors(node.sectors).includes(sector);
}

function isDirector(role?: string | null) {
  return normalizeRole(role).includes('DIRETOR');
}

function isHiddenRole(role?: string | null) {
  const r = normalizeRole(role);
  return r.includes('ADMIN');
}

function roleWeight(role?: string | null, level?: number | null) {
  const r = normalizeRole(role);

  if (r.includes('DIRETOR')) return 600;
  if (r.includes('GERENTE')) return 500;
  if (r.includes('COORDENADOR')) return 400;
  if (r.includes('SUPERVISOR')) return 300;
  if (r.includes('ANALISTA')) return 200;

  if (
    r.includes('TECNICO') ||
    r.includes('PSO') ||
    r.includes('SPOT') ||
    r.includes('PRP')
  ) {
    return 100;
  }

  return Number(level || 0);
}

function sortTree(nodes: OrgNode[]): OrgNode[] {
  const sorted = [...nodes].sort((a, b) => {
    const diff =
      roleWeight(b.role, b.roleLevel) - roleWeight(a.role, a.roleLevel);

    if (diff !== 0) return diff;

    return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
  });

  return sorted.map((n) => ({
    ...n,
    children: sortTree(n.children || []),
  }));
}

function dedupeTree(nodes: OrgNode[]): OrgNode[] {
  const seen = new Set<number>();

  const walk = (node: OrgNode): OrgNode | null => {
    if (seen.has(node.id)) return null;
    seen.add(node.id);

    const children = (node.children || [])
      .map(walk)
      .filter(Boolean) as OrgNode[];

    return {
      ...node,
      children,
    };
  };

  return nodes.map(walk).filter(Boolean) as OrgNode[];
}

function pruneHiddenRoles(nodes: OrgNode[]): OrgNode[] {
  const walk = (node: OrgNode): OrgNode[] => {
    const nextChildren = (node.children || []).flatMap(walk);

    if (isHiddenRole(node.role)) {
      return nextChildren;
    }

    return [{ ...node, children: nextChildren }];
  };

  return nodes.flatMap(walk);
}

function filterTreeBySector(nodes: OrgNode[], sector: SectorFilter): OrgNode[] {
  const walk = (node: OrgNode): OrgNode | null => {
    const nextChildren = (node.children || [])
      .map(walk)
      .filter(Boolean) as OrgNode[];

    const matches = hasSector(node, sector) || isDirector(node.role);

    if (matches || nextChildren.length > 0) {
      return {
        ...node,
        children: nextChildren,
      };
    }

    return null;
  };

  return nodes.map(walk).filter(Boolean) as OrgNode[];
}

function countDescendants(node: OrgNode): number {
  const children = node.children || [];
  let total = children.length;

  for (const child of children) {
    total += countDescendants(child);
  }

  return total;
}
function isAnalystRole(role?: string | null) {
  return normalizeRole(role).includes('ANALISTA');
}

function isManagerialRole(role?: string | null) {
  const r = normalizeRole(role);
  return r.includes('GERENTE') || r.includes('COORDENADOR');
}

function shouldAutoExpand(node: OrgNode) {
  const children = node.children || [];
  if (!children.length) return false;

  const fewChildren = children.length <= 6;
  const allChildrenAreAnalysts = children.every((child) =>
    isAnalystRole(child.role)
  );

  return isManagerialRole(node.role) && fewChildren && allChildrenAreAnalysts;
}

function collectInitialOpenIds(nodes: OrgNode[]) {
  const openIds = new Set<number>();

  const walk = (node: OrgNode, isRoot = false) => {
    if (isRoot) {
      openIds.add(node.id);
    }

    if (shouldAutoExpand(node)) {
      openIds.add(node.id);
    }

    for (const child of node.children || []) {
      walk(child, false);
    }
  };

  for (const root of nodes) {
    walk(root, true);
  }

  return openIds;
}

function getVisibleChildren(children: OrgNode[], expanded: Set<number>) {
  const expandedChildren = children.filter((c) => expanded.has(c.id));
  return expandedChildren.length > 0 ? expandedChildren : children;
}

function OrgNodePhoto({
  src,
  name,
  size = 64,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
}) {
  const imageSrc = absImage(src);

  if (!imageSrc) {
    return (
      <Avatar
        className="org-classic-avatar"
        size={size}
        style={{ flexShrink: 0 }}
      >
        {name?.[0]}
      </Avatar>
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={name || 'Foto do colaborador'}
      width={size}
      height={size}
      preview={{ mask: 'Ver foto' }}
      style={{
        width: size,
        height: size,
        objectFit: 'cover',
        borderRadius: '50%',
        overflow: 'hidden',
        border: '2px solid #e6eef7',
        cursor: 'pointer',
        flexShrink: 0,
        display: 'block',
      }}
    />
  );
}

function OrgClassicNode({
  node,
  expanded,
  onToggle,
}: {
  node: OrgNode;
  expanded: Set<number>;
  onToggle: (id: number) => void;
}) {
  const allChildren = node.children || [];
  const hasChildren = allChildren.length > 0;
  const isOpen = expanded.has(node.id);
  const totalBelow = countDescendants(node);

  const visibleChildren = hasChildren
    ? getVisibleChildren(allChildren, expanded)
    : [];

  const showConnectorToChildren =
    hasChildren && isOpen && visibleChildren.length > 0;

  return (
    <div className="org-block">
      <div
        className="org-classic-card"
        style={{
          borderRadius: 18,
          border: '1px solid #e6eef7',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          background: '#fff',
          padding: 14,
        }}
      >
        <div
          className="org-classic-card-left"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            minWidth: 0,
          }}
        >
          <OrgNodePhoto
            src={node.avatarUrl}
            name={node.name}
            size={64}
          />

          <div
            className="org-classic-meta"
            style={{
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div
              className="org-classic-name"
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.2,
                wordBreak: 'break-word',
              }}
            >
              {node.name}
            </div>

            <div
              className="org-classic-role"
              style={{
                fontSize: 13,
                color: '#64748b',
                lineHeight: 1.3,
                wordBreak: 'break-word',
              }}
            >
              {node.role || 'Sem cargo'}
            </div>
          </div>
        </div>

        {hasChildren && (
          <button
            className="org-classic-toggle"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            style={{
              minWidth: 64,
              height: 42,
              borderRadius: 12,
              border: '1px solid #dbe7f3',
              background: isOpen ? '#eff6ff' : '#f8fafc',
              color: '#1d4ed8',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {isOpen ? <CaretDownOutlined /> : <CaretRightOutlined />}
            <span>{totalBelow}</span>
          </button>
        )}
      </div>

      {showConnectorToChildren && <div className="org-connector-vertical" />}

      {showConnectorToChildren && (
        <div
          className={`org-children-grid ${
            visibleChildren.length > 4 ? 'cols-4' : ''
          }`}
        >
          {visibleChildren.map((child) => (
            <div key={child.id} className="org-child-col">
              <OrgClassicNode
                node={child}
                expanded={expanded}
                onToggle={onToggle}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgPage() {
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>('OPERACOES');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery<OrgNode[]>({
    queryKey: ['org-tree'],
    queryFn: async () => (await api.get('/org/tree')).data,
  });

  const visibleRoots = useMemo(() => {
    const base = Array.isArray(data) ? data : [];
    const bySector = filterTreeBySector(base, sectorFilter);
    const withoutHidden = pruneHiddenRoles(bySector);
    const unique = dedupeTree(withoutHidden);
    return sortTree(unique);
  }, [data, sectorFilter]);

  useEffect(() => {
    setExpanded(collectInitialOpenIds(visibleRoots));
  }, [visibleRoots]);

  const toggleNode = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  return (
    <div
      className="org-classic-page"
      style={{
        padding: 20,
      }}
    >
      <div
        className="org-classic-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>
            Organograma
          </Title>
          <Text type="secondary">
            Visualize a estrutura hierárquica por área.
          </Text>
        </div>

        <Segmented
          value={sectorFilter}
          onChange={(v) => setSectorFilter(v as SectorFilter)}
          options={[
            { label: 'Operações', value: 'OPERACOES' },
            { label: 'Logística', value: 'LOGISTICA' },
            { label: 'Sistemas', value: 'SISTEMAS' },
            { label: 'Atendimento', value: 'ATENDIMENTO' },
          ]}
        />
      </div>

      {isLoading ? (
        <div
          className="org-classic-loading"
          style={{
            minHeight: 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spin size="large" />
        </div>
      ) : visibleRoots.length === 0 ? (
        <Card
          style={{
            borderRadius: 18,
            border: '1px solid #e6eef7',
          }}
        >
          <Empty description="Nenhum colaborador encontrado nesta área." />
        </Card>
      ) : (
        <div
          className="org-no-scroll-wrapper"
          style={{
            overflowX: 'auto',
            overflowY: 'visible',
            paddingBottom: 12,
          }}
        >
          {visibleRoots.map((root) => (
            <OrgClassicNode
              key={root.id}
              node={root}
              expanded={expanded}
              onToggle={toggleNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}