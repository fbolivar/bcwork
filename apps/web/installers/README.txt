ZIP por-tenant (installers/<tenantId>.zip), servido por /api/admin/installer (solo tenant_admin).
Cada ZIP contiene: BCWork-Agent.msi (firmado, token horneado) + bcwork-codesign.cer + Instalar.bat.

Generar para un tenant nuevo:
1) node apps/agent/scripts/make-tenant-msi.mjs apps/agent/scripts/base-installer.msi <tid>.msi  (imprime token_hash/prefix)
2) signtool sign /f certs/bcwork-codesign.pfx /p ... /fd sha256 /tr http://timestamp.digicert.com /td sha256 <tid>.msi
3) empacar msi + certs/bcwork-codesign.cer + apps/agent/scripts/Instalar.bat en <tid>.zip
4) insertar token_hash en agent_provisioning_tokens (tenant_id, token_hash, token_prefix, created_by)
