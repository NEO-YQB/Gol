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
  { key: 'nationalId', label: 'کد ملی' },
  { key: 'roles', label: 'نقش های اصلی' },
  { key: 'status', label: 'وضعیت' },
  { key: 'scope', label: 'دامنه دسترسی' },
]

const roleColumns = [
  { key: 'name', label: 'نقش' },
  { key: 'permissions', label: 'تعداد دسترسی' },
  { key: 'users', label: 'کاربر متصل' },
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
        label: 'کاربران',
        value: String(users.length),
        delta: 'نمای فعلی',
        detail: '',
        tone: 'primary' as const,
      },
      {
        label: 'نقش‌ها',
        value: String(roles.length),
        delta: 'تعریف‌شده',
        detail: '',
        tone: 'warning' as const,
      },
      {
        label: 'دسترسی‌ها',
        value: String(permissions.length),
        delta: 'مرجع',
        detail: '',
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
        nationalId: readText(user, ['nationalId'], '—'),
        roles: getUserRoles(user).slice(0, 2).join(' / ') || 'بدون نقش',
        status: readBoolean(user, ['isActive'], true) ? 'فعال' : 'غیرفعال',
        scope: toArray(user.effectivePermissions).length
          ? `${toArray(user.effectivePermissions).length} دسترسی موثر`
          : 'بدون دسترسی موثر',
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
    <div className="fm-stack access-control-page refined-access-page">
      <LoadableState error={error} loading={loading}>
        <div className="fm-grid refined-stat-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>
      </LoadableState>

      <div className="refined-access-overview">
        <SectionCard
          eyebrow="کاربران"
          title="کاربران و دسترسی‌ها"
          actions={
            <button className="fm-button fm-button--primary" onClick={onOpenWorkspace} type="button">
              ورود به میزکار
            </button>
          }
        >
          <div className="access-compact-summary-grid">
            <div className="access-compact-summary-card">
              <strong>مدیریت کاربران</strong>
              <p>{canMutateUsers ? 'ویرایش کاربر فعال است.' : 'فقط مشاهده مجاز است.'}</p>
            </div>
            <div className="access-compact-summary-card">
              <strong>مدیریت نقش‌ها</strong>
              <p>{canMutateRoles ? 'ویرایش نقش فعال است.' : 'ویرایش نقش محدود است.'}</p>
            </div>
            <div className="access-compact-summary-card">
              <strong>دامنه دسترسی</strong>
              <p>منوها و عملیات از همین لایه کنترل می‌شوند.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard eyebrow="نشست" title="سطح دسترسی این حساب">
          <div className="access-control-capability-list compact-capability-list">
            <Pill tone={canMutateUsers ? 'success' : 'neutral'}>{canMutateUsers ? 'ویرایش کاربر فعال' : 'ویرایش کاربر محدود'}</Pill>
            <Pill tone={canMutateRoles ? 'warning' : 'neutral'}>{canMutateRoles ? 'ویرایش نقش فعال' : 'ویرایش نقش محدود'}</Pill>
            <Pill>نمای ترجمه‌شده</Pill>
          </div>
        </SectionCard>
      </div>

      <div className="refined-access-tables">
        <SectionCard eyebrow="کاربران" title="فهرست کاربران">
          <DataTable columns={userColumns} rows={userRows} />
        </SectionCard>

        <SectionCard eyebrow="نقش‌ها" title="فهرست نقش‌ها">
          <DataTable columns={roleColumns} rows={roleRows} />
        </SectionCard>
      </div>
    </div>
  )
}
