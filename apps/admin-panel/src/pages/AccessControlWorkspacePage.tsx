import { Pill, SectionCard } from '@flower-marketplace/frontend-core'
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

type RoleOption = {
  id: number
  label: string
}

const actionLabels: Record<string, string> = {
  manage: 'مدیریت کامل',
  read: 'مشاهده',
  create: 'ایجاد',
  update: 'ویرایش',
  delete: 'حذف',
  assignTags: 'اتصال تگ',
  updateStatus: 'تغییر وضعیت',
  assignRoles: 'تخصیص نقش',
  assignPermissions: 'تخصیص دسترسی',
}

const subjectLabels: Record<string, string> = {
  all: 'همه بخش ها',
  AdminUser: 'کاربران پنل',
  AdminRole: 'نقش های پنل',
  AdminPermission: 'دسترسی های پنل',
  Article: 'مقاله',
  ArticleCategory: 'دسته بندی مقاله',
  ArticleTag: 'برچسب مقاله',
  Author: 'نویسنده',
  Order: 'سفارش',
  Payment: 'پرداخت',
  SupportTicket: 'تیکت پشتیبانی',
  SupportTicketNote: 'یادداشت پشتیبانی',
  StoreWallet: 'کیف پول فروشگاه',
  WalletTransaction: 'تراکنش کیف پول',
  CommissionRule: 'قواعد کمیسیون',
}

function translateAction(action: string) {
  return actionLabels[action] ?? action
}

function translateSubject(subject: string) {
  return subjectLabels[subject] ?? subject
}

function translatePermission(record: PermissionRecord) {
  return `${translateAction(readText(record, ['action'], '—'))} ${translateSubject(readText(record, ['subject'], '—'))}`
}

function toIdentity(user: UserRecord) {
  const name = readText(user, ['fullName'], '')
  const phone = readText(user, ['phoneNumber'], '—')
  return name ? `${name} - ${phone}` : phone
}

function toRoleLabel(role: RoleRecord) {
  return readText(role, ['label'], '') || readText(role, ['name'], '—')
}

function mapRoleOptions(roles: RoleRecord[]): RoleOption[] {
  return roles.map((role) => ({
    id: Number(readText(role, ['id'], '0')),
    label: toRoleLabel(role),
  }))
}

export function AccessControlWorkspacePage({ session, onBack }: AccessControlWorkspacePageProps) {
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [permissions, setPermissions] = useState<PermissionRecord[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [selectedRole, setSelectedRole] = useState<RoleRecord | null>(null)
  const [roleDraftName, setRoleDraftName] = useState('')
  const [roleDraftLabel, setRoleDraftLabel] = useState('')
  const [roleDraftDescription, setRoleDraftDescription] = useState('')
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleLabel, setNewRoleLabel] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [userRoleSelection, setUserRoleSelection] = useState<number[]>([])
  const [rolePermissionSelection, setRolePermissionSelection] = useState<number[]>([])
  const [permissionSearch, setPermissionSearch] = useState('')
  const [permissionSubjectFilter, setPermissionSubjectFilter] = useState('ALL')

  useNoticeEffect(error, 'error')
  useNoticeEffect(message, 'success')

  const canAssignUserRoles = hasPermission(session, 'assignRoles', 'AdminUser')
  const canUpdateUserStatus = hasPermission(session, 'updateStatus', 'AdminUser')
  const canAssignRolePermissions = hasPermission(session, 'assignPermissions', 'AdminRole')
  const canCreateRole = hasPermission(session, 'create', 'AdminRole')
  const canEditRole = hasPermission(session, 'update', 'AdminRole')

  async function loadLists() {
    const [usersPayload, rolesPayload, permissionsPayload] = await Promise.all([
      adminApi.getAccessControlUsers(session, { page: 1, limit: 24 }),
      adminApi.getAccessControlRoles(session),
      adminApi.getAccessControlPermissions(session, { page: 1, limit: 120 }),
    ])

    const userList = toArray((usersPayload as Record<string, unknown>)?.data)
    const roleList = toArray(rolesPayload)
    const permissionList = toArray((permissionsPayload as Record<string, unknown>)?.data)

    setUsers(userList)
    setRoles(roleList)
    setPermissions(permissionList)

    if (!selectedUserId && userList.length) {
      setSelectedUserId(readText(userList[0], ['id'], ''))
    }

    if (!selectedRoleId && roleList.length) {
      setSelectedRoleId(readText(roleList[0], ['id'], ''))
    }
  }

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        await loadLists()
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
        const userId = selectedUserId
        if (!userId) return
        const payload = await adminApi.getAccessControlUserDetail(session, userId)
        if (!active) return
        const nextUser = (payload as Record<string, unknown>) ?? null
        setSelectedUser(nextUser)
        setUserRoleSelection(
          toArray(nextUser?.roles).map((role) => Number(readText(role as Record<string, unknown>, ['id'], '0'))),
        )
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
        const roleId = selectedRoleId
        if (!roleId) return
        const payload = await adminApi.getAccessControlRoleDetail(session, roleId)
        if (!active) return
        const nextRole = (payload as Record<string, unknown>) ?? null
        setSelectedRole(nextRole)
        setRoleDraftName(readText(nextRole ?? {}, ['name'], ''))
        setRoleDraftLabel(readText(nextRole ?? {}, ['label'], ''))
        setRoleDraftDescription(readText(nextRole ?? {}, ['description'], ''))
        setRolePermissionSelection(
          toArray(nextRole?.permissions).map((permission) => Number(readText(permission as Record<string, unknown>, ['id'], '0'))),
        )
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

  async function refreshAll() {
    await loadLists()
    if (selectedUserId) {
      const userDetail = await adminApi.getAccessControlUserDetail(session, selectedUserId)
      setSelectedUser((userDetail as Record<string, unknown>) ?? null)
    }
    if (selectedRoleId) {
      const roleDetail = await adminApi.getAccessControlRoleDetail(session, selectedRoleId)
      setSelectedRole((roleDetail as Record<string, unknown>) ?? null)
    }
  }

  async function handleUserStatusToggle() {
    if (!selectedUserId || !selectedUser || !canUpdateUserStatus) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const nextStatus = !readBoolean(selectedUser, ['isActive'], true)
      await adminApi.updateAccessControlUserStatus(session, selectedUserId, { isActive: nextStatus })
      await refreshAll()
      setMessage(nextStatus ? 'کاربر دوباره فعال شد.' : 'کاربر با موفقیت غیرفعال شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تغییر وضعیت کاربر ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveUserRoles() {
    if (!selectedUserId || !canAssignUserRoles) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await adminApi.updateAccessControlUserRoles(session, selectedUserId, { roleIds: userRoleSelection })
      await refreshAll()
      setMessage('نقش های کاربر با موفقیت به روز شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'به روزرسانی نقش های کاربر ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateRole() {
    if (!canCreateRole) return
    if (!newRoleName.trim() || !newRoleLabel.trim()) {
      setError('برای ساخت نقش جدید، نام سیستمی و عنوان نمایشی را کامل کن.')
      return
    }

    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const payload = await adminApi.createAccessControlRole(session, {
        name: newRoleName.trim().toUpperCase(),
        label: newRoleLabel.trim(),
        description: newRoleDescription.trim() || undefined,
      })
      const createdRole = (payload as Record<string, unknown>) ?? null
      setSelectedRoleId(readText(createdRole ?? {}, ['id'], selectedRoleId ?? ''))
      setNewRoleName('')
      setNewRoleLabel('')
      setNewRoleDescription('')
      await refreshAll()
      setMessage('نقش جدید ساخته شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ساخت نقش جدید ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveRoleMeta() {
    if (!selectedRoleId || !canEditRole) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await adminApi.updateAccessControlRole(session, selectedRoleId, {
        name: roleDraftName.trim().toUpperCase(),
        label: roleDraftLabel.trim(),
        description: roleDraftDescription.trim() || undefined,
      })
      await refreshAll()
      setMessage('اطلاعات نقش به روز شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'به روزرسانی نقش ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveRolePermissions() {
    if (!selectedRoleId || !canAssignRolePermissions) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await adminApi.updateAccessControlRolePermissions(session, selectedRoleId, {
        permissionIds: rolePermissionSelection,
      })
      await refreshAll()
      setMessage('دسترسی های نقش با موفقیت جایگزین شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'به روزرسانی دسترسی های نقش ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  const roleOptions = useMemo(() => mapRoleOptions(roles), [roles])
  const selectedUserRoleLabels = toArray(selectedUser?.roles).map((role) => toRoleLabel(role as RoleRecord))
  const userPermissionPreview = toArray(selectedUser?.effectivePermissions).slice(0, 8)
  const selectedRolePermissions = toArray(selectedRole?.permissions)

  const visiblePermissions = useMemo(() => {
    const normalizedSearch = permissionSearch.trim().toLowerCase()
    return permissions.filter((permission) => {
      const subject = readText(permission, ['subject'], '')
      const action = readText(permission, ['action'], '')
      const matchesSubject = permissionSubjectFilter === 'ALL' || subject === permissionSubjectFilter
      if (!matchesSubject) return false
      if (!normalizedSearch) return true

      const translated = `${translateAction(action)} ${translateSubject(subject)}`.toLowerCase()
      return translated.includes(normalizedSearch)
    })
  }, [permissionSearch, permissionSubjectFilter, permissions])

  const permissionSubjectOptions = useMemo(
    () => ['ALL', ...Array.from(new Set(permissions.map((permission) => readText(permission, ['subject'], '')))).filter(Boolean)],
    [permissions],
  )

  return (
    <div className="fm-stack access-workspace refined-access-workspace">
      <div className="access-workspace-toolbar access-workspace-toolbar--compact">
        <button className="fm-button fm-button--ghost" onClick={onBack} type="button">
          بازگشت به کارتابل کاربران و دسترسی
        </button>
        <div className="access-workspace-toolbar__actions">
          <Pill tone={canAssignUserRoles ? 'success' : 'neutral'}>{canAssignUserRoles ? 'ویرایش نقش کاربر فعال' : 'ویرایش نقش کاربر غیرفعال'}</Pill>
          <Pill tone={canAssignRolePermissions ? 'warning' : 'neutral'}>{canAssignRolePermissions ? 'ویرایش دسترسی نقش فعال' : 'ویرایش دسترسی نقش غیرفعال'}</Pill>
        </div>
      </div>

      <div className="access-lane-grid">
        <SectionCard eyebrow="انتخاب کاربر" title="کارتابل کوتاه کاربران" description="فقط برای انتخاب سریع کاربر و ورود به جزئیات تصمیم گیری.">
          <LoadableState error={error} loading={loading}>
            <div className="access-selection-list compact-selection-list">
              {users.map((user) => {
                const id = readText(user, ['id'], '')
                return (
                  <button
                    className={`access-selection-item compact-selection-item${id === selectedUserId ? ' is-active' : ''}`}
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

        <SectionCard eyebrow="کاربر انتخاب شده" title="وضعیت، نقش ها و actionهای کاربر" description="همه actionهای اصلی کاربر در همین سطح کوتاه، روشن و بدون کش آمدگی جمع شده اند.">
          <LoadableState error={error} loading={detailLoading && !selectedUser}>
            {selectedUser ? (
              <div className="access-detail-panel compact-detail-panel">
                <div className="access-detail-section compact-detail-section">
                  <strong>{toIdentity(selectedUser)}</strong>
                  <p>
                    {readBoolean(selectedUser, ['isActive'], true) ? 'حساب فعال است' : 'حساب غیرفعال است'}
                    {' - '}
                    {readText(selectedUser, ['email'], 'ایمیلی ثبت نشده است')}
                  </p>
                </div>

                <div className="access-pill-row">
                  {selectedUserRoleLabels.length ? selectedUserRoleLabels.map((label) => <Pill key={label}>{label}</Pill>) : <Pill>بدون نقش</Pill>}
                </div>

                <div className="access-mini-meta-grid">
                  <div className="access-mini-meta-card">
                    <strong>{readNumber(selectedUser, ['counts', 'orders'], 0)}</strong>
                    <span>سفارش ثبت شده</span>
                  </div>
                  <div className="access-mini-meta-card">
                    <strong>{readNumber(selectedUser, ['counts', 'supportTickets'], 0)}</strong>
                    <span>تیکت پشتیبانی</span>
                  </div>
                  <div className="access-mini-meta-card">
                    <strong>{toArray(selectedUser.effectivePermissions).length}</strong>
                    <span>دسترسی موثر</span>
                  </div>
                </div>

                <div className="access-form-cluster">
                  <label className="fm-field">
                    <span>نقش های کاربر</span>
                    <select
                      multiple
                      disabled={!canAssignUserRoles || saving}
                      onChange={(event) =>
                        setUserRoleSelection(Array.from(event.target.selectedOptions).map((option) => Number(option.value)))
                      }
                      value={userRoleSelection.map(String)}
                    >
                      {roleOptions.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="access-inline-actions">
                    <button className="fm-button fm-button--secondary" disabled={!canAssignUserRoles || saving} onClick={handleSaveUserRoles} type="button">
                      ذخیره نقش های کاربر
                    </button>
                    <button className="fm-button fm-button--ghost" disabled={!canUpdateUserStatus || saving} onClick={handleUserStatusToggle} type="button">
                      {readBoolean(selectedUser, ['isActive'], true) ? 'غیرفعال کردن حساب' : 'فعال کردن دوباره حساب'}
                    </button>
                  </div>
                </div>

                <div className="access-permission-preview">
                  <strong>پیش نمایش دسترسی های موثر</strong>
                  <div className="access-permission-chips compact-permission-chips">
                    {userPermissionPreview.length ? userPermissionPreview.map((permission, index) => (
                      <span className="access-permission-chip" key={readText(permission as Record<string, unknown>, ['id'], String(index))}>
                        {translatePermission(permission as PermissionRecord)}
                      </span>
                    )) : <span className="access-muted-note">هنوز دسترسی موثری برای این کاربر دیده نمی شود.</span>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="fm-message">برای دیدن جزئیات، یک کاربر را انتخاب کن.</div>
            )}
          </LoadableState>
        </SectionCard>
      </div>

      <div className="access-lane-grid">
        <SectionCard eyebrow="فهرست نقش ها" title="کارتابل فشرده نقش ها" description="برای انتخاب سریع نقش و حرکت به بخش ویرایش آن.">
          <div className="access-selection-list compact-selection-list">
            {roles.map((role) => {
              const id = readText(role, ['id'], '')
              return (
                <button
                  className={`access-selection-item compact-selection-item${id === selectedRoleId ? ' is-active' : ''}`}
                  key={id}
                  onClick={() => setSelectedRoleId(id)}
                  type="button"
                >
                  <strong>{toRoleLabel(role)}</strong>
                  <small>{readNumber(role, ['permissionCount'], 0)} دسترسی / {readNumber(role, ['userCount'], 0)} کاربر</small>
                </button>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard eyebrow="ویرایش نقش" title="عنوان، توضیح و دسترسی های نقش" description="این سطح برای ویرایش واقعی role طراحی شده و دیگر فقط نمایش خام داده نیست.">
          <LoadableState error={error} loading={detailLoading && !selectedRole}>
            {selectedRole ? (
              <div className="access-role-editor">
                <div className="access-form-grid compact-form-grid">
                  <label className="fm-field">
                    <span>نام سیستمی نقش</span>
                    <input disabled={!canEditRole || saving} onChange={(event) => setRoleDraftName(event.target.value)} value={roleDraftName} />
                  </label>
                  <label className="fm-field">
                    <span>عنوان نمایشی</span>
                    <input disabled={!canEditRole || saving} onChange={(event) => setRoleDraftLabel(event.target.value)} value={roleDraftLabel} />
                  </label>
                </div>

                <label className="fm-field">
                  <span>توضیح نقش</span>
                  <textarea disabled={!canEditRole || saving} onChange={(event) => setRoleDraftDescription(event.target.value)} rows={3} value={roleDraftDescription} />
                </label>

                <div className="access-inline-actions">
                  <button className="fm-button fm-button--secondary" disabled={!canEditRole || saving} onClick={handleSaveRoleMeta} type="button">
                    ذخیره مشخصات نقش
                  </button>
                </div>

                <div className="access-form-cluster">
                  <div className="access-filter-row compact-filter-row">
                    <label className="fm-field">
                      <span>جستجوی دسترسی</span>
                      <input onChange={(event) => setPermissionSearch(event.target.value)} placeholder="مثلا مشاهده مقاله یا کاربران" value={permissionSearch} />
                    </label>
                    <label className="fm-field">
                      <span>فیلتر حوزه</span>
                      <select onChange={(event) => setPermissionSubjectFilter(event.target.value)} value={permissionSubjectFilter}>
                        {permissionSubjectOptions.map((subject) => (
                          <option key={subject} value={subject}>
                            {subject === 'ALL' ? 'همه حوزه ها' : translateSubject(subject)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="fm-field">
                    <span>دسترسی های نقش</span>
                    <select
                      multiple
                      disabled={!canAssignRolePermissions || saving}
                      onChange={(event) =>
                        setRolePermissionSelection(Array.from(event.target.selectedOptions).map((option) => Number(option.value)))
                      }
                      value={rolePermissionSelection.map(String)}
                    >
                      {visiblePermissions.map((permission) => {
                        const id = Number(readText(permission, ['id'], '0'))
                        return (
                          <option key={id} value={id}>
                            {translatePermission(permission)}
                          </option>
                        )
                      })}
                    </select>
                  </label>

                  <div className="access-inline-actions">
                    <button className="fm-button fm-button--primary" disabled={!canAssignRolePermissions || saving} onClick={handleSaveRolePermissions} type="button">
                      ذخیره دسترسی های نقش
                    </button>
                  </div>
                </div>

                <div className="access-permission-preview">
                  <strong>دسترسی های فعلی نقش</strong>
                  <div className="access-permission-chips compact-permission-chips">
                    {selectedRolePermissions.slice(0, 18).map((permission, index) => (
                      <span className="access-permission-chip" key={readText(permission as Record<string, unknown>, ['id'], String(index))}>
                        {translatePermission(permission as PermissionRecord)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="fm-message">برای ویرایش، یک نقش را انتخاب کن.</div>
            )}
          </LoadableState>
        </SectionCard>
      </div>

      <SectionCard eyebrow="ساخت نقش جدید" title="افزودن نقش عملیاتی تازه" description="اگر تیم جدیدی مثل مالی یا پشتیبانی نیاز به role جدا داشته باشد، از همینجا تعریف اولیه آن انجام می شود.">
        <div className="access-form-grid compact-form-grid access-create-role-grid">
          <label className="fm-field">
            <span>نام سیستمی</span>
            <input onChange={(event) => setNewRoleName(event.target.value)} placeholder="مثلا MARKETING_OPERATOR" value={newRoleName} />
          </label>
          <label className="fm-field">
            <span>عنوان نمایشی</span>
            <input onChange={(event) => setNewRoleLabel(event.target.value)} placeholder="مثلا اپراتور بازاریابی" value={newRoleLabel} />
          </label>
        </div>
        <label className="fm-field">
          <span>توضیح نقش</span>
          <textarea onChange={(event) => setNewRoleDescription(event.target.value)} placeholder="توضیح کوتاه و روشن درباره دامنه این نقش" rows={3} value={newRoleDescription} />
        </label>
        <div className="access-inline-actions">
          <button className="fm-button fm-button--primary" disabled={!canCreateRole || saving} onClick={handleCreateRole} type="button">
            ساخت نقش جدید
          </button>
        </div>
      </SectionCard>
    </div>
  )
}
