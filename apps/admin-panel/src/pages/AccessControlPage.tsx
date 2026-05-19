import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { readBoolean, readNumber, readText, toArray } from '../lib/normalize'
import { hasPermission } from '../lib/permissions'
import type { AuthSession } from '../lib/session'

type AccessControlPageProps = {
  session: AuthSession
  onOpenWorkspace: () => void
}

type UserRecord = Record<string, unknown>
type RoleRecord = Record<string, unknown>
type PermissionRecord = Record<string, unknown>

const userColumns = [
  { key: 'name', label: 'کاربر' },
  { key: 'roles', label: 'نقش ها' },
  { key: 'status', label: 'وضعیت' },
  { key: 'scope', label: 'دامنه دسترسی' },
]

const roleColumns = [
  { key: 'name', label: 'نقش' },
  { key: 'permissions', label: 'تعداد permission' },
  { key: 'users', label: 'کاربران' },
]

function getUserLabel(user: UserRecord) {
  return readText(user, ['fullName'], '') || readText(user, ['phoneNumber'], 'کاربر بدون نام')
}

function getUserRoles(user: UserRecord) {
  return toArray(user.roles).map((role) => readText(role as Record<string, unknown>, ['label'], '') || readText(role as Record<string, unknown>, ['name'], '—'))
}

export function AccessControlPage({ session, onOpenWorkspace }: AccessControlPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [permissions, setPermissions] = useState<PermissionRecord[]>([])
  useNoticeEffect(error, 'error')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [usersPayload, rolesPayload, permissionsPayload] = await Promise.all([
          adminApi.getAccessControlUsers(session, { page: 1, limit: 8 }),
          adminApi.getAccessControlRoles(session),
          adminApi.getAccessControlPermissions(session, { page: 1, limit: 12 }),
        ])

        if (!active) return

        setUsers(toArray((usersPayload as Record<string, unknown>)?.data))
        setRoles(toArray(rolesPayload))
        setPermissions(toArray((permissionsPayload as Record<string, unknown>)?.data))
      } catch (requestError) {
        if (!active) return
        setError(requestError instanceof Error ? requestError.message : 'خطا در بارگذاری مدیریت دسترسی')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [session])

  const stats = useMemo(
    () => [
      {
        label: 'کاربران قابل مدیریت',
        value: String(users.length),
        delta: 'scope live',
        detail: 'نمونه ای از کاربران با role و permission موثر',
        tone: 'primary' as const,
      },
      {
        label: 'نقش های فعال',
        value: String(roles.length),
        delta: 'matrix ready',
        detail: 'roleهای حاضر در ماتریس دسترسی',
        tone: 'warning' as const,
      },
      {
        label: 'permissionهای نمایشی',
        value: String(permissions.length),
        delta: 'bootstrap source',
        detail: 'نمای اولیه از permission catalog سیستم',
        tone: 'success' as const,
      },
    ],
    [permissions.length, roles.length, users.length],
  )

  const userRows = useMemo(
    () =>
      users.map((user, index) => ({
        id: readText(user, ['id'], String(index)),
        name: getUserLabel(user),
        roles: getUserRoles(user).slice(0, 2).join(' / ') || 'بدون نقش',
        status: readBoolean(user, ['isActive'], true) ? 'فعال' : 'غیرفعال',
        scope: toArray(user.effectivePermissions).length
          ? `${toArray(user.effectivePermissions).length} permission موثر`
          : 'permission موثری ثبت نشده',
      })),
    [users],
  )

  const roleRows = useMemo(
    () =>
      roles.slice(0, 6).map((role, index) => ({
        id: readText(role, ['id'], String(index)),
        name: readText(role, ['label'], '') || readText(role, ['name'], '—'),
        permissions: String(readNumber(role, ['permissionCount'], 0)),
        users: String(readNumber(role, ['userCount'], 0)),
      })),
    [roles],
  )

  const canMutateRoles = hasPermission(session, 'assignPermissions', 'AdminRole') || hasPermission(session, 'create', 'AdminRole')
  const canMutateUsers = hasPermission(session, 'assignRoles', 'AdminUser') || hasPermission(session, 'updateStatus', 'AdminUser')

  return (
    <div className="fm-stack access-control-page">
      <LoadableState error={error} loading={loading}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>
      </LoadableState>

      <div className="access-control-overview-grid">
        <SectionCard
          eyebrow="لایه دسترسی"
          title="نمای فشرده کاربران، نقش ها و permissionها"
          description="این route برای دید سریع، وضعیت فعلی دسترسی ها و ورود به workspace کامل مدیریت کاربران ساخته شده است."
          actions={
            <button className="fm-button fm-button--primary" onClick={onOpenWorkspace} type="button">
              ورود به workspace دسترسی
            </button>
          }
        >
          <div className="access-control-summary-list">
            <div className="access-control-summary-item">
              <strong>مدیریت کاربران</strong>
              <p>{canMutateUsers ? 'فعال برای role فعلی' : 'فقط مشاهده برای role فعلی'}</p>
            </div>
            <div className="access-control-summary-item">
              <strong>ماتریس role</strong>
              <p>{canMutateRoles ? 'قابل ویرایش' : 'فقط قابل مشاهده'}</p>
            </div>
            <div className="access-control-summary-item">
              <strong>permission catalog</strong>
              <p>برای bootstrap navigation و route guard فرانت آماده است.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="scope جاری"
          title="قابلیت های این نشست"
          description="در این لایه UI، actionها و CTAها بر اساس permissionهای واقعی نشست فعلی نمایش داده می شوند."
        >
          <div className="access-control-capability-list">
            <Pill tone={canMutateUsers ? 'success' : 'neutral'}>
              {canMutateUsers ? 'تغییر کاربر فعال' : 'تغییر کاربر غیرفعال'}
            </Pill>
            <Pill tone={canMutateRoles ? 'warning' : 'neutral'}>
              {canMutateRoles ? 'ویرایش role فعال' : 'ویرایش role غیرفعال'}
            </Pill>
            <Pill>route guard سراسری</Pill>
            <Pill>navigation هوشمند</Pill>
          </div>
        </SectionCard>
      </div>

      <div className="access-control-snapshots-grid">
        <SectionCard eyebrow="کاربران" title="فهرست کوتاه کاربران" description="نمونه ای از کاربرهایی که همین حالا برای مدیریت در دسترس اند.">
          <DataTable columns={userColumns} rows={userRows} />
        </SectionCard>

        <SectionCard eyebrow="نقش ها" title="نقش های کلیدی سیستم" description="roleها با تعداد permission و تعداد کاربر برای تصمیم گیری سریع دیده می شوند.">
          <DataTable columns={roleColumns} rows={roleRows} />
        </SectionCard>
      </div>
    </div>
  )
}
