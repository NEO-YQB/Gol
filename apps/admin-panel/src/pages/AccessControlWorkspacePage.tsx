import { DataTable, Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { readBoolean, readNumber, readText, toArray } from '../lib/normalize'
import { hasPermission } from '../lib/permissions'
import type { AuthSession } from '../lib/session'

type AccessControlWorkspacePageProps = {
  session: AuthSession
  onBack: () => void
}

type UserRecord = Record<string, unknown>
type RoleRecord = Record<string, unknown>
type PermissionRecord = Record<string, unknown>

const userColumns = [
  { key: 'identity', label: 'کاربر' },
  { key: 'roles', label: 'نقش ها' },
  { key: 'status', label: 'وضعیت' },
  { key: 'counts', label: 'ردپای عملیاتی' },
]

const permissionColumns = [
  { key: 'action', label: 'action' },
  { key: 'subject', label: 'subject' },
  { key: 'roles', label: 'roleهای متصل' },
]

function toIdentity(user: UserRecord) {
  const name = readText(user, ['fullName'], '')
  const phone = readText(user, ['phoneNumber'], '—')
  return name ? `${name} - ${phone}` : phone
}

function toRoleLabel(role: RoleRecord) {
  return readText(role, ['label'], '') || readText(role, ['name'], '—')
}

export function AccessControlWorkspacePage({ session, onBack }: AccessControlWorkspacePageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [permissions, setPermissions] = useState<PermissionRecord[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [selectedRole, setSelectedRole] = useState<RoleRecord | null>(null)
  useNoticeEffect(error, 'error')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [usersPayload, rolesPayload, permissionsPayload] = await Promise.all([
          adminApi.getAccessControlUsers(session, { page: 1, limit: 24 }),
          adminApi.getAccessControlRoles(session),
          adminApi.getAccessControlPermissions(session, { page: 1, limit: 40 }),
        ])

        if (!active) return

        const userList = toArray((usersPayload as Record<string, unknown>)?.data)
        const roleList = toArray(rolesPayload)
        setUsers(userList)
        setRoles(roleList)
        setPermissions(toArray((permissionsPayload as Record<string, unknown>)?.data))
        setSelectedUserId(userList.length ? readText(userList[0] as Record<string, unknown>, ['id'], '') : null)
        setSelectedRoleId(roleList.length ? readText(roleList[0] as Record<string, unknown>, ['id'], '') : null)
      } catch (requestError) {
        if (!active) return
        setError(requestError instanceof Error ? requestError.message : 'خطا در بارگذاری workspace دسترسی')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [session])

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUser(null)
      return
    }

    let active = true
    async function loadUser() {
      setDetailLoading(true)
      try {
        const payload = await adminApi.getAccessControlUserDetail(session, selectedUserId)
        if (!active) return
        setSelectedUser((payload as Record<string, unknown>) ?? null)
      } catch (requestError) {
        if (!active) return
        setError(requestError instanceof Error ? requestError.message : 'خطا در بارگذاری جزئیات کاربر')
      } finally {
        if (active) setDetailLoading(false)
      }
    }
    void loadUser()
    return () => {
      active = false
    }
  }, [selectedUserId, session])

  useEffect(() => {
    if (!selectedRoleId) {
      setSelectedRole(null)
      return
    }

    let active = true
    async function loadRole() {
      setDetailLoading(true)
      try {
        const payload = await adminApi.getAccessControlRoleDetail(session, selectedRoleId)
        if (!active) return
        setSelectedRole((payload as Record<string, unknown>) ?? null)
      } catch (requestError) {
        if (!active) return
        setError(requestError instanceof Error ? requestError.message : 'خطا در بارگذاری جزئیات نقش')
      } finally {
        if (active) setDetailLoading(false)
      }
    }
    void loadRole()
    return () => {
      active = false
    }
  }, [selectedRoleId, session])

  const userRows = useMemo(
    () =>
      users.map((user, index) => ({
        id: readText(user, ['id'], String(index)),
        identity: toIdentity(user),
        roles: toArray(user.roles)
          .map((role) => toRoleLabel(role as RoleRecord))
          .slice(0, 3)
          .join(' / ') || 'بدون نقش',
        status: readBoolean(user, ['isActive'], true) ? 'فعال' : 'غیرفعال',
        counts: `${readNumber(user, ['counts', 'orders'], 0)} سفارش / ${readNumber(user, ['counts', 'supportTickets'], 0)} تیکت`,
      })),
    [users],
  )

  const permissionRows = useMemo(
    () =>
      permissions.map((permission, index) => ({
        id: readText(permission, ['id'], String(index)),
        action: readText(permission, ['action'], '—'),
        subject: readText(permission, ['subject'], '—'),
        roles: toArray(permission.roles)
          .map((role) => readText(role as Record<string, unknown>, ['label'], '') || readText(role as Record<string, unknown>, ['name'], '—'))
          .slice(0, 3)
          .join(' / ') || 'بدون اتصال',
      })),
    [permissions],
  )

  const selectedUserRoleLabels = toArray(selectedUser?.roles).map((role) => toRoleLabel(role as RoleRecord))
  const selectedRolePermissions = toArray(selectedRole?.permissions)
  const canAssignUserRoles = hasPermission(session, 'assignRoles', 'AdminUser')
  const canUpdateUserStatus = hasPermission(session, 'updateStatus', 'AdminUser')
  const canAssignRolePermissions = hasPermission(session, 'assignPermissions', 'AdminRole')
  const canCreateRole = hasPermission(session, 'create', 'AdminRole')

  return (
    <div className="fm-stack access-workspace">
      <div className="access-workspace-toolbar">
        <button className="fm-button fm-button--ghost" onClick={onBack} type="button">
          بازگشت به کارتابل دسترسی
        </button>
        <div className="access-workspace-toolbar__actions">
          <Pill tone={canAssignUserRoles ? 'success' : 'secondary'}>
            {canAssignUserRoles ? 'assign role فعال' : 'assign role غیرفعال'}
          </Pill>
          <Pill tone={canAssignRolePermissions ? 'warning' : 'secondary'}>
            {canAssignRolePermissions ? 'assign permission فعال' : 'assign permission غیرفعال'}
          </Pill>
          <Pill>{canCreateRole ? 'ساخت role مجاز' : 'ساخت role محدود'}</Pill>
        </div>
      </div>

      <div className="access-workspace-grid">
        <SectionCard eyebrow="کارتابل کاربران" title="انتخاب کاربر برای بررسی دقیق" description="سطح اول فقط برای انتخاب، اسکن سریع و ورود به تصمیم است.">
          <LoadableState error={error} loading={loading}>
            <DataTable columns={userColumns} rows={userRows} />
            <div className="access-selection-list">
              {users.map((user) => {
                const id = readText(user, ['id'], '')
                const active = id === selectedUserId
                return (
                  <button
                    className={`access-selection-item${active ? ' is-active' : ''}`}
                    key={id}
                    onClick={() => setSelectedUserId(id)}
                    type="button"
                  >
                    <strong>{toIdentity(user)}</strong>
                    <small>{toArray(user.roles).map((role) => toRoleLabel(role as RoleRecord)).join(' / ') || 'بدون نقش'}</small>
                  </button>
                )
              })}
            </div>
          </LoadableState>
        </SectionCard>

        <SectionCard
          eyebrow="جزئیات کاربر"
          title="summary متمرکز برای تصمیم روی کاربر"
          description="این بخش برای دیدن نقش ها، permissionهای موثر و آمادگی برای actionهای role/status ساخته شده است."
        >
          <LoadableState error={error} loading={detailLoading && !selectedUser}>
            {selectedUser ? (
              <div className="access-detail-panel">
                <div className="access-detail-section">
                  <strong>{toIdentity(selectedUser)}</strong>
                  <p>
                    وضعیت: {readBoolean(selectedUser, ['isActive'], true) ? 'فعال' : 'غیرفعال'}
                    {' - '}
                    {readText(selectedUser, ['email'], 'ایمیل ثبت نشده')}
                  </p>
                </div>
                <div className="access-pill-row">
                  {selectedUserRoleLabels.length ? selectedUserRoleLabels.map((label) => <Pill key={label}>{label}</Pill>) : <Pill>بدون نقش</Pill>}
                </div>
                <div className="access-detail-section">
                  <strong>permissionهای موثر</strong>
                  <p>{toArray(selectedUser.effectivePermissions).length} مورد در این نشست برای کاربر موثر است.</p>
                </div>
                <div className="access-capability-note">
                  <span>{canAssignUserRoles ? 'تعویض role از این نشست مجاز است.' : 'این نشست فقط اجازه مشاهده roleها را دارد.'}</span>
                  <span>{canUpdateUserStatus ? 'تغییر status کاربر مجاز است.' : 'تغییر status کاربر در این نشست مجاز نیست.'}</span>
                </div>
              </div>
            ) : (
              <div className="fm-message">ابتدا یک کاربر را از ستون کناری انتخاب کن.</div>
            )}
          </LoadableState>
        </SectionCard>
      </div>

      <div className="access-workspace-grid access-workspace-grid--roles">
        <SectionCard eyebrow="ماتریس نقش" title="roleهای سیستم و permissionهایشان" description="ویرایش واقعی در فاز بعدی روی همین workspace سوار می شود؛ اینجا contract و چیدمان آن تثبیت می شود.">
          <div className="access-selection-list access-selection-list--roles">
            {roles.map((role) => {
              const id = readText(role, ['id'], '')
              const active = id === selectedRoleId
              return (
                <button
                  className={`access-selection-item${active ? ' is-active' : ''}`}
                  key={id}
                  onClick={() => setSelectedRoleId(id)}
                  type="button"
                >
                  <strong>{toRoleLabel(role)}</strong>
                  <small>{readNumber(role, ['permissionCount'], 0)} permission / {readNumber(role, ['userCount'], 0)} کاربر</small>
                </button>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard eyebrow="جزئیات نقش" title="نمای متمرکز permissionهای role" description="این بخش برای تصمیم گیری روی ساخت role جدید، ویرایش label و جایگزینی permissionها آماده شده است.">
          <LoadableState error={error} loading={detailLoading && !selectedRole}>
            {selectedRole ? (
              <div className="access-role-detail">
                <div className="access-detail-section">
                  <strong>{toRoleLabel(selectedRole)}</strong>
                  <p>{readText(selectedRole, ['description'], 'توضیحی برای این role ثبت نشده است.')}</p>
                </div>
                <div className="access-pill-row">
                  <Pill tone={canCreateRole ? 'warning' : 'secondary'}>
                    {canCreateRole ? 'ویرایش role مجاز' : 'ویرایش role محدود'}
                  </Pill>
                  <Pill tone={canAssignRolePermissions ? 'success' : 'secondary'}>
                    {canAssignRolePermissions ? 'تغییر permission مجاز' : 'تغییر permission محدود'}
                  </Pill>
                </div>
                <div className="access-permission-chips">
                  {selectedRolePermissions.slice(0, 16).map((permission, index) => (
                    <span className="access-permission-chip" key={`${readText(permission as Record<string, unknown>, ['id'], String(index))}`}>
                      {readText(permission as Record<string, unknown>, ['action'], '—')}:{readText(permission as Record<string, unknown>, ['subject'], '—')}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="fm-message">ابتدا یک role را برای بررسی انتخاب کن.</div>
            )}
          </LoadableState>
        </SectionCard>
      </div>

      <SectionCard eyebrow="permission catalog" title="ماتریس فشرده permissionها" description="فرانت از همین catalog برای mapping actionها، navigation و CTAهای دسترسی محور استفاده می کند.">
        <DataTable columns={permissionColumns} rows={permissionRows} />
      </SectionCard>
    </div>
  )
}
