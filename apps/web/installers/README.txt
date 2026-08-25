MSI firmados por-tenant (installers/<tenantId>.msi), servidos por /api/admin/installer (solo tenant_admin).
Se generan con: node apps/agent/scripts/make-tenant-msi.mjs apps/agent/scripts/base-installer.msi apps/web/installers/<tenantId>.msi  (+ firma con certs/bcwork-codesign.pfx)
