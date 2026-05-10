insert into public.companies (id, name, slug, domain, domain_verified_at, logo_url, brand_color, timezone, locale, plan, owner_user_id, created_at, updated_at)
values ('11111111-1111-4111-8111-111111111111','Demo Company','demo-company','demo-company.com',now(),null,'#0F172A','Europe/Berlin','de-DE','pro','22222222-2222-4222-8222-222222222222',now(),now())
on conflict (id) do nothing;

insert into public.users (id, company_id, email, full_name, role, is_active, created_at, updated_at) values
('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','hr@demo-company.com','Harriet Admin','hr_admin',true,now(),now()),
('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','manager@demo-company.com','Marta Manager','manager',true,now(),now()),
('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','it@demo-company.com','Ivan IT','it_admin',true,now(),now()),
('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','newhire@demo-company.com','Nina Newhire','new_hire',true,now(),now())
on conflict (id) do nothing;

insert into public.onboarding_templates (id, company_id, name, description, department, is_default, created_by, created_at, updated_at) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Software Engineer','Standard onboarding for engineering hires','Engineering',true,'22222222-2222-4222-8222-222222222222',now(),now()),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','Sales Representative','Onboarding plan for sales team hires','Sales',false,'22222222-2222-4222-8222-222222222222',now(),now()),
('cccccccc-cccc-4ccc-8ccc-cccccccccccd','11111111-1111-4111-8111-111111111111','Operations Manager','Onboarding plan for operations leadership','Operations',false,'22222222-2222-4222-8222-222222222222',now(),now())
on conflict (id) do nothing;

insert into public.template_tasks (id, template_id, company_id, title, description, task_type, phase, assigned_role, due_day_offset, sort_order, is_required, created_at, updated_at) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Send welcome email','Introduce the new hire to the team','checkbox','pre_boarding','hr_admin',-3,0,true,now(),now()),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Prepare workstation','Set up laptop accounts and access','checkbox','pre_boarding','it_admin',-1,1,true,now(),now()),
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Sign employment contract','Upload signed contract PDF','document_upload','pre_boarding','new_hire',0,2,true,now(),now()),
('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Meet the team','Introductory meeting with direct team','meeting','week_1','new_hire',1,3,true,now(),now()),
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Complete security training','Acknowledge security policy','acknowledgement','week_1','new_hire',5,4,true,now(),now()),
('ffffffff-ffff-4fff-8fff-ffffffffffff','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Set up dev environment','Clone repos and run local setup','checkbox','week_1','new_hire',3,5,true,now(),now()),
('11111111-1111-4111-8111-111111111112','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','30-day check-in','Manager 1:1 review','meeting','month_1','manager',30,6,true,now(),now()),
('22222222-2222-4222-8222-222222222223','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Submit personal details form','HR form for payroll setup','form_submission','month_1','new_hire',7,7,true,now(),now()),
('33333333-3333-4333-8333-333333333334','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','90-day performance review','Formal review with manager','meeting','month_3','manager',90,8,false,now(),now())
on conflict (id) do nothing;

insert into public.hires (id, company_id, user_id, manager_id, template_id, full_name, email, job_title, department, start_date, status, completion_pct, invited_at, started_at, notes, created_by, created_at, updated_at) values
('a1a1a1a1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Nina Newhire','newhire@demo-company.com','Frontend Developer','Engineering',current_date,'in_progress',33,now(),now(),'Joining the web platform team','22222222-2222-4222-8222-222222222222',now(),now()),
('a2a2a2a2-0002-4002-8002-000000000002','11111111-1111-4111-8111-111111111111',null,'33333333-3333-4333-8333-333333333333','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Sam Sales','sam.sales@demo-company.com','Account Executive','Sales',current_date + 7,'pending_invite',0,now(),null,null,'22222222-2222-4222-8222-222222222222',now(),now())
on conflict (id) do nothing;

insert into public.hire_tasks (id, hire_id, company_id, template_task_id, title, description, task_type, phase, assigned_role, due_date, status, is_required, sort_order, created_at, updated_at) values
('b1b1b1b1-0001-4001-8001-000000000001','a1a1a1a1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Send welcome email',null,'checkbox','pre_boarding','hr_admin',current_date - 3,'completed',true,0,now(),now()),
('b2b2b2b2-0002-4002-8002-000000000002','a1a1a1a1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Prepare workstation','Set up laptop accounts and access','checkbox','pre_boarding','it_admin',current_date - 1,'completed',true,1,now(),now()),
('b3b3b3b3-0003-4003-8003-000000000003','a1a1a1a1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','cccccccc-cccc-4ccc-8ccc-cccccccccccc','Sign employment contract','Upload signed contract PDF','document_upload','pre_boarding','new_hire',current_date,'pending',true,2,now(),now()),
('b4b4b4b4-0004-4004-8004-000000000004','a1a1a1a1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','dddddddd-dddd-4ddd-8ddd-dddddddddddd','Meet the team','Introductory meeting with direct team','meeting','week_1','new_hire',current_date + 1,'pending',true,3,now(),now()),
('b5b5b5b5-0005-4005-8005-000000000005','a1a1a1a1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','Complete security training','Acknowledge security policy','acknowledgement','week_1','new_hire',current_date + 5,'pending',true,4,now(),now()),
('b6b6b6b6-0006-4006-8006-000000000006','a1a1a1a1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','ffffffff-ffff-4fff-8fff-ffffffffffff','Set up dev environment','Clone repos and run local setup','checkbox','week_1','new_hire',current_date + 3,'pending',true,5,now(),now())
on conflict (id) do nothing;

insert into public.documents (id, company_id, hire_id, uploaded_by, reviewed_by, name, original_name, file_path, file_size, mime_type, category, is_company_doc, version, status, reviewed_at, retention_until, gdpr_basis, created_at, updated_at) values
('c1c1c1c1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111',null,'22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222','Employee Handbook 2024','employee_handbook_2024.pdf','11111111-1111-4111-8111-111111111111/company/employee_handbook_2024.pdf',2048000,'application/pdf','policy',true,2,'approved',now(),current_date + 1095,'legitimate_interest',now(),now()),
('c2c2c2c2-0002-4002-8002-000000000002','11111111-1111-4111-8111-111111111111',null,'22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222','NDA Template','nda_template.pdf','11111111-1111-4111-8111-111111111111/company/nda_template.pdf',512000,'application/pdf','contract',true,1,'approved',now(),current_date + 2555,'legitimate_interest',now(),now()),
('c4c4c4c4-0004-4004-8004-000000000004','11111111-1111-4111-8111-111111111111','a1a1a1a1-0001-4001-8001-000000000001','55555555-5555-4555-8555-555555555555',null,'Employment Contract Nina Newhire','employment_contract_signed.pdf','11111111-1111-4111-8111-111111111111/a1a1a1a1-0001-4001-8001-000000000001/employment_contract_signed.pdf',1024000,'application/pdf','contract',false,1,'pending_review',null,current_date + 2555,'contractual_necessity',now(),now())
on conflict (id) do nothing;

insert into public.it_checklist_templates (id, company_id, name, description, is_default, created_by, created_at, updated_at) values
('d1d1d1d1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','Standard IT Onboarding','Default IT provisioning checklist for all new hires',true,'22222222-2222-4222-8222-222222222222',now(),now())
on conflict (id) do nothing;

insert into public.it_checklist_template_items (id, template_id, company_id, title, description, category, sort_order, is_required, created_at) values
('e1e1e1e1-0001-4001-8001-000000000001','d1d1d1d1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','Provision laptop','Order and configure MacBook Pro 14','hardware',0,true,now()),
('e2e2e2e2-0002-4002-8002-000000000002','d1d1d1d1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','Create company email','Set up firstname.lastname@company.com','communication',1,true,now()),
('e3e3e3e3-0003-4003-8003-000000000003','d1d1d1d1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','Add to Slack workspace','Invite to general and relevant team channels','communication',2,true,now()),
('e4e4e4e4-0004-4004-8004-000000000004','d1d1d1d1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','Grant GitHub access','Add to org and relevant repos','access',3,true,now()),
('e5e5e5e5-0005-4005-8005-000000000005','d1d1d1d1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','Set up VPN credentials','Create WireGuard config and send securely','security',4,true,now()),
('e6e6e6e6-0006-4006-8006-000000000006','d1d1d1d1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','Install required software','VS Code Docker Node.js 1Password','software',5,true,now()),
('e7e7e7e7-0007-4007-8007-000000000007','d1d1d1d1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','Configure 2FA MFA','Enable on Google GitHub Slack and VPN','security',6,true,now()),
('e8e8e8e8-0008-4008-8008-000000000008','d1d1d1d1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','Add to Jira Linear','Create account and assign to correct project','software',7,false,now()),
('e9e9e9e9-0009-4009-8009-000000000009','d1d1d1d1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','Desk and monitor setup','Assign desk external monitor keyboard mouse','hardware',8,false,now())
on conflict (id) do nothing;

insert into public.it_checklists (id, company_id, hire_id, template_id, assigned_to, status, completion_pct, due_date, notes, created_at, updated_at) values
('f1f1f1f1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','a1a1a1a1-0001-4001-8001-000000000001','d1d1d1d1-0001-4001-8001-000000000001','44444444-4444-4444-8444-444444444444','in_progress',33,current_date,'Priority hire engineering team start date is firm',now(),now())
on conflict (id) do nothing;

insert into public.it_checklist_items (id, checklist_id, company_id, template_item_id, title, description, category, sort_order, is_required, status, asset_tag, serial_number, completed_by, completed_at, created_at, updated_at) values
('f1f1f1f1-1001-4001-8001-000000000001','f1f1f1f1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','e1e1e1e1-0001-4001-8001-000000000001','Provision laptop','Order and configure MacBook Pro 14','hardware',0,true,'completed','ASSET-0042','C02XK1JFHV2Q','44444444-4444-4444-8444-444444444444',now(),now(),now()),
('f2f2f2f2-1002-4002-8002-000000000002','f1f1f1f1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','e2e2e2e2-0002-4002-8002-000000000002','Create company email','Set up firstname.lastname@company.com','communication',1,true,'completed',null,null,'44444444-4444-4444-8444-444444444444',now(),now(),now()),
('f3f3f3f3-1003-4003-8003-000000000003','f1f1f1f1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','e3e3e3e3-0003-4003-8003-000000000003','Add to Slack workspace','Invite to general and relevant team channels','communication',2,true,'completed',null,null,'44444444-4444-4444-8444-444444444444',now(),now(),now()),
('f4f4f4f4-1004-4004-8004-000000000004','f1f1f1f1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','e4e4e4e4-0004-4004-8004-000000000004','Grant GitHub access','Add to org and relevant repos','access',3,true,'pending',null,null,null,null,now(),now()),
('f5f5f5f5-1005-4005-8005-000000000005','f1f1f1f1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','e5e5e5e5-0005-4005-8005-000000000005','Set up VPN credentials','Create WireGuard config','security',4,true,'pending',null,null,null,null,now(),now()),
('f6f6f6f6-1006-4006-8006-000000000006','f1f1f1f1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','e6e6e6e6-0006-4006-8006-000000000006','Install required software','VS Code Docker Node.js 1Password','software',5,true,'pending',null,null,null,null,now(),now()),
('f7f7f7f7-1007-4007-8007-000000000007','f1f1f1f1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','e7e7e7e7-0007-4007-8007-000000000007','Configure 2FA MFA','Enable on Google GitHub Slack and VPN','security',6,true,'pending',null,null,null,null,now(),now()),
('f8f8f8f8-1008-4008-8008-000000000008','f1f1f1f1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','e8e8e8e8-0008-4008-8008-000000000008','Add to Jira Linear','Create account and assign to correct project','software',7,false,'pending',null,null,null,null,now(),now()),
('f9f9f9f9-1009-4009-8009-000000000009','f1f1f1f1-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','e9e9e9e9-0009-4009-8009-000000000009','Desk and monitor setup','Assign desk external monitor keyboard mouse','hardware',8,false,'blocked',null,null,null,null,now(),now())
on conflict (id) do nothing;

insert into public.notifications (id, company_id, user_id, type, title, body, link, metadata, is_read, created_at) values
('a0a0a0a0-0001-4001-8001-000000000001','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','doc_uploaded','Document uploaded for review','Nina Newhire uploaded Employment Contract','/documents/c4c4c4c4-0004-4004-8004-000000000004','{}',false,now()),
('a0a0a0a0-0002-4002-8002-000000000002','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','hire_at_risk','Hire at risk overdue tasks','Nina Newhire has 1 overdue required task','/hires/a1a1a1a1-0001-4001-8001-000000000001','{}',false,now()),
('a0a0a0a0-0004-4004-8004-000000000004','11111111-1111-4111-8111-111111111111','55555555-5555-4555-8555-555555555555','task_assigned','New task assigned','Please sign your employment contract','/tasks/b3b3b3b3-0003-4003-8003-000000000003','{}',true,now()),
('a0a0a0a0-0005-4005-8005-000000000005','11111111-1111-4111-8111-111111111111','55555555-5555-4555-8555-555555555555','task_due_soon','Task due today','Sign employment contract is due today','/tasks/b3b3b3b3-0003-4003-8003-000000000003','{}',false,now())
on conflict (id) do nothing;