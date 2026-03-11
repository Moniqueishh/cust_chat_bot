import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import http from "http";
import { Server } from "socket.io";
import db from "./db";

dotenv.config();

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);
  const PORT = 3000;

  app.use(express.json());

  // Socket.io setup
  io.on('connection', (socket) => {
    socket.on('join-thread', (threadId) => {
      socket.join(`thread-${threadId}`);
    });
    socket.on('join-admin', () => {
      socket.join('admin-room');
    });
  });

  // Helper: Categorize message
  function categorizeMessage(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('schedule') || lower.includes('time') || lower.includes('when') || lower.includes('date') || lower.includes('appointment')) return 'Scheduling';
    if (lower.includes('price') || lower.includes('cost') || lower.includes('quote') || lower.includes('expensive') || lower.includes('money') || lower.includes('£')) return 'Pricing';
    if (lower.includes('permit') || lower.includes('council') || lower.includes('permission') || lower.includes('legal')) return 'Permits';
    if (lower.includes('install') || lower.includes('arrival') || lower.includes('today')) return 'Install Day';
    if (lower.includes('pay') || lower.includes('card') || lower.includes('bank') || lower.includes('invoice') || lower.includes('paid')) return 'Payment';
    if (lower.includes('charger') || lower.includes('easee') || lower.includes('cable') || lower.includes('box') || lower.includes('hardware')) return 'Hardware';
    if (lower.includes('reschedule') || lower.includes('change') || lower.includes('move') || lower.includes('cancel')) return 'Reschedule';
    return 'Support';
  }

  // Helper: Update Daily Stats
  function updateStats(updates: {
    linksSent?: number;
    uniqueOpens?: number;
    totalOpens?: number;
    messageOpens?: number;
    customerMessages?: number;
    installerMessages?: number;
    conversationCount?: number;
    afterHoursMessages?: number;
    responseTimeSum?: number;
    responseTimeCount?: number;
    tileClick?: string;
    category?: string;
  }) {
    const today = new Date().toISOString().split('T')[0];
    let stats = db.prepare('SELECT * FROM stats_daily WHERE date = ?').get(today) as any;
    
    if (!stats) {
      db.prepare('INSERT INTO stats_daily (date) VALUES (?)').run(today);
      stats = db.prepare('SELECT * FROM stats_daily WHERE date = ?').get(today) as any;
    }

    const categories = JSON.parse(stats.categories || '{}');
    if (updates.category) {
      categories[updates.category] = (categories[updates.category] || 0) + 1;
    }

    const tileClicks = JSON.parse(stats.tileClicks || '{}');
    if (updates.tileClick) {
      tileClicks[updates.tileClick] = (tileClicks[updates.tileClick] || 0) + 1;
    }

    const fields = [
      'linksSent', 'uniqueOpens', 'totalOpens', 'messageOpens', 
      'customerMessages', 'installerMessages', 'conversationCount', 
      'afterHoursMessages', 'responseTimeSum', 'responseTimeCount'
    ];

    const updatesList = [];
    const params = [];

    fields.forEach(field => {
      const val = (updates as any)[field];
      if (val !== undefined) {
        updatesList.push(`${field} = ${field} + ?`);
        params.push(val);
      }
    });

    updatesList.push(`categories = ?`);
    params.push(JSON.stringify(categories));
    
    updatesList.push(`tileClicks = ?`);
    params.push(JSON.stringify(tileClicks));

    const query = `UPDATE stats_daily SET ${updatesList.join(', ')} WHERE date = ?`;
    params.push(today);

    db.prepare(query).run(...params);
  }

  // Debug middleware to verify if requests reach Express
  app.use((req, res, next) => {
    res.setHeader('X-App-Status', 'Express-Is-Running');
    console.log(`[Server] ${req.method} ${req.url}`);
    next();
  });

  // Simple health check
  app.get("/health-check", (req, res) => {
    res.json({ status: "ok", message: "Express is responding" });
  });

  // Proxy for n8n check-customer
  app.post("/api/auth/check-customer", async (req, res) => {
    try {
      const { email } = req.body;
      const n8nUrl = process.env.VITE_N8N_WEBHOOK_URL || "https://n8n.dev.jumptech.tools/webhook/check-customer";
      
      console.log(`[Proxy] Calling n8n check-customer for: ${email} at ${n8nUrl}`);
      const response = await fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          customerEmail: email, 
          customer_email: email,
          emailAddress: email,
          email_address: email,
          customer_email_address: email
        }),
      });
      
      const data = await response.json();
      console.log(`[Proxy] n8n check-customer response:`, JSON.stringify(data).substring(0, 200));
      res.json(data);
    } catch (error) {
      console.error("Error proxying n8n check-customer:", error);
      res.status(500).json({ error: "Failed to connect to n8n" });
    }
  });

  // Proxy for n8n redeem
  app.post("/api/auth/redeem", async (req, res) => {
    try {
      const { token } = req.body;
      const n8nUrl = "https://n8n.dev.jumptech.tools/webhook/auth/redeem";
      
      console.log(`[Proxy] Calling n8n redeem for token`);
      const response = await fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error proxying n8n redeem:", error);
      res.status(500).json({ error: "Failed to connect to n8n" });
    }
  });

  // Fetch projects by email (for demo and real use)
  app.get("/api/auth/projects-by-email/:email", async (req, res) => {
    try {
      const { email } = req.params;
      console.log(`[Server] Fetching projects for email: ${email}`);

      // 1. Try real Jumptech API first if configured
      const apiKey = process.env.JUMPTECH_API_KEY?.replace(/['"]/g, '').trim();
      const apiUrl = (process.env.JUMPTECH_API_URL || 'https://api.jumptech.co.uk').replace(/\/$/, '');
      
      let allProjects: any[] = [];

      if (apiKey && apiKey !== 'YOUR_JUMPTECH_API_KEY') {
        try {
          console.log(`[Server] Calling Jumptech API for projects by email: ${email}`);
          // Try multiple common query parameters
          const queries = ['customerEmail', 'email', 'customer_email'];
          for (const q of queries) {
            const response = await fetch(`${apiUrl}/projects?${q}=${encodeURIComponent(email)}`, {
              headers: { 'Authorization': apiKey, 'Accept': 'application/json' }
            });
            if (response.ok) {
              const data = await response.json();
              const found = Array.isArray(data) ? data : (data.projects || data.data || []);
              if (Array.isArray(found) && found.length > 0) {
                allProjects = [...allProjects, ...found];
              }
            }
          }
        } catch (error) {
          console.error(`Jumptech API error for email ${email}:`, error);
        }
      }

      // 2. Try n8n check-customer
      if (allProjects.length === 0) {
        const n8nUrl = process.env.VITE_N8N_WEBHOOK_URL || "https://n8n.dev.jumptech.tools/webhook/check-customer";
        console.log(`[Server] Calling n8n check-customer for: ${email} at ${n8nUrl}`);
        try {
          const response = await fetch(n8nUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              email, 
              customerEmail: email, 
              customer_email: email,
              emailAddress: email,
              email_address: email,
              customer_email_address: email
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`[Server] n8n response for ${email}:`, JSON.stringify(data).substring(0, 200));
            
            if (Array.isArray(data)) {
              allProjects = data;
            } else if (data && data.projects && Array.isArray(data.projects)) {
              allProjects = data.projects;
            } else if (data && (data.projectId || data.id || data.firstName || data.customerFirstName)) {
              allProjects = [data];
            } else if (data && typeof data === 'object') {
              // Look for any array in the object
              const arrays = Object.values(data).filter(v => Array.isArray(v));
              if (arrays.length > 0) {
                allProjects = arrays[0] as any[];
              }
            }
          }
        } catch (n8nErr) {
          console.error(`n8n error for email ${email}:`, n8nErr);
        }
      }

      // 3. Fallback for demo emails
      if (allProjects.length === 0 && (email.toLowerCase().includes('demo') || email.toLowerCase().includes('test') || email.toLowerCase().includes('jumptech'))) {
        allProjects = [
          { 
            projectId: "DEMO-PROJECT-001", 
            projectType: "Residential EV", 
            status: "in_progress",
            jobType: "US Residential Installation",
            chargerType: "Easee One",
            firstName: "Demo",
            lastName: "Customer"
          },
          { 
            projectId: "DEMO-PROJECT-002", 
            projectType: "Commercial", 
            status: "ready_for_survey",
            jobType: "Commercial Solar Array",
            chargerType: "Tesla Wall Connector",
            firstName: "Demo",
            lastName: "Customer"
          }
        ];
      }
      
      // Deduplicate by projectId
      const uniqueProjects = Array.from(new Map(allProjects.map(p => [p.projectId || p.id || p.project_id || p.jobId, p])).values());

      // Normalize project objects
      const normalizedProjects = uniqueProjects.map((p: any) => {
        const firstName = p.firstName || p.customerFirstName || p.customer_first_name || p.first_name || p.FirstName || p.CustomerFirstName || (p.customer_name ? p.customer_name.split(' ')[0] : "Customer");
        const lastName = p.lastName || p.customerLastName || p.customer_last_name || p.last_name || p.LastName || p.CustomerLastName || (p.customer_name ? p.customer_name.split(' ').slice(1).join(' ') : "");
        
        return {
          ...p,
          projectId: p.projectId || p.id || p.project_id || p.jobId || p.job_id || p.ProjectID || p.ID,
          firstName,
          lastName,
          status: p.status || p.projectStatus || p.project_status || p.jobStatus || p.job_status || p.Status || p.ProjectStatus || "in_progress",
          jobType: p.jobType || p.projectType || p.project_type || p.job_type || p.JobType || p.ProjectType || "EV Installation",
          chargerType: p.chargerType || p.charger_type || p.ChargerType || p.hardware || "EV Charger"
        };
      });

      console.log(`[Server] Found ${normalizedProjects.length} projects for ${email}`);
      res.json({ ok: true, projects: normalizedProjects });
    } catch (error) {
      console.error("Error fetching projects by email:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  // Renamed route back to /api/project as requested, but keeping debug headers
  app.get("/api/project/:id", async (req, res) => {
    const { id } = req.params;
    console.log(`[Server] Fetching data for project: ${id}`);
    
    try {
      const data = await fetchJumptechProject(id);
      res.json(data);
    } catch (error) {
      console.error('Error proxying Jumptech API:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- Project Comms API ---

  // Helper: Fetch Project from Jumptech with n8n Fallback
  async function fetchJumptechProject(id: string) {
    const apiKey = process.env.JUMPTECH_API_KEY?.replace(/['"]/g, '').trim();
    const apiUrl = (process.env.JUMPTECH_API_URL || 'https://api.jumptech.co.uk').replace(/\/$/, '');
    
    // 1. Try real Jumptech API first if configured
    if (apiKey && apiKey !== 'YOUR_JUMPTECH_API_KEY') {
      try {
        console.log(`[Server] Calling Jumptech API for project: ${id}`);
        const response = await fetch(`${apiUrl}/projects/project/${id}`, {
          headers: { 'Authorization': apiKey, 'Accept': 'application/json' }
        });
        if (response.ok) {
          const data = await response.json();
          return { 
            ...data, 
            id: data.id || id,
            firstName: data.firstName || data.customerFirstName || "Customer",
            lastName: data.lastName || data.customerLastName || "",
            status: data.status || data.projectStatus || "in_progress"
          };
        }
      } catch (error) {
        console.error(`Jumptech API error for ${id}:`, error);
      }
    }

    // 2. Fallback: Try n8n webhook for project details
    try {
      const n8nUrl = process.env.VITE_N8N_PROJECT_URL || "https://n8n.dev.jumptech.tools/webhook/get-project";
      console.log(`[Server] Trying n8n fallback for project: ${id} at ${n8nUrl}`);
      
      const n8nResponse = await fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          projectId: id, 
          id: id, 
          project_id: id, 
          jobId: id,
          job_id: id,
          ProjectID: id,
          ID: id
        }),
      });
      
      if (n8nResponse.ok) {
        const n8nData = await n8nResponse.ok ? await n8nResponse.json() : null;
        if (n8nData) {
          const project = Array.isArray(n8nData) ? n8nData[0] : n8nData;
          if (project && (project.projectId || project.id || project.firstName || project.customerFirstName || project.customer_first_name || project.customer_name)) {
            console.log(`[Server] Successfully fetched project ${id} from n8n`);
            
            const firstName = project.firstName || project.customerFirstName || project.customer_first_name || project.first_name || (project.customer_name ? project.customer_name.split(' ')[0] : "Customer");
            const lastName = project.lastName || project.customerLastName || project.customer_last_name || project.last_name || (project.customer_name ? project.customer_name.split(' ').slice(1).join(' ') : "");
            
            return {
              ...project,
              id: project.id || project.projectId || project.project_id || id,
              firstName,
              lastName,
              status: project.status || project.projectStatus || project.project_status || project.jobStatus || project.job_status || "in_progress"
            };
          }
        }
      }
    } catch (n8nError) {
      console.error(`n8n fallback error for ${id}:`, n8nError);
    }

    // 3. Try check-customer as a last resort if id looks like an email
    if (id.includes('@')) {
      try {
        const n8nUrl = process.env.VITE_N8N_WEBHOOK_URL || "https://n8n.dev.jumptech.tools/webhook/check-customer";
        const response = await fetch(n8nUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: id, customerEmail: id }),
        });
        const data = await response.json();
        const project = Array.isArray(data) ? data[0] : (data.projects ? data.projects[0] : data);
        if (project && (project.projectId || project.id || project.firstName)) {
          return {
            ...project,
            id: project.id || project.projectId || id,
            firstName: project.firstName || project.customerFirstName || "Customer",
            lastName: project.lastName || project.customerLastName || "",
            status: project.status || project.projectStatus || "in_progress"
          };
        }
      } catch (e) {}
    }

    // 4. Final fallback to mock
    return getMockProject(id);
  }

  function getMockProject(id: string) {
    return {
      id: id,
      firstName: "Demo",
      lastName: "Customer",
      status: "in_progress",
      chargerType: "Easee One",
      quoteStatus: "accepted",
      installedAt: null,
      address: "123 Solar Way, Brighton, BN1 1AA",
      phoneNumber: "07700 900000",
      email: "demo@example.com"
    };
  }

  // 1) getPageDataByToken(token)
  app.get("/api/comms/page/:token", async (req, res) => {
    try {
      const { token: identifier } = req.params;

      let thread = db.prepare('SELECT * FROM threads WHERE token = ?').get(identifier) as any;
      let projectData: any = null;
      
      if (!thread) {
        // Try as projectId
        thread = db.prepare('SELECT * FROM threads WHERE projectId = ?').get(identifier) as any;
        
        if (!thread && identifier.includes('@')) {
          // It's an email - try to find real projects first
          try {
            const n8nUrl = process.env.VITE_N8N_WEBHOOK_URL || "https://n8n.dev.jumptech.tools/webhook/check-customer";
            const response = await fetch(n8nUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                email: identifier, 
                customerEmail: identifier,
                customer_email: identifier,
                emailAddress: identifier,
                email_address: identifier
              }),
            });
            const data = await response.json();
            const projects = Array.isArray(data) ? data : (data.projects || [data]);
            const firstProject = projects[0];
            
            if (firstProject && (firstProject.projectId || firstProject.id)) {
              const pId = firstProject.projectId || firstProject.id;
              const newToken = crypto.randomBytes(32).toString('hex');
              const customerName = `${firstProject.firstName || firstProject.customerFirstName || 'Customer'} ${firstProject.lastName || firstProject.customerLastName || ''}`.trim();
              const result = db.prepare('INSERT INTO threads (projectId, token, customerName) VALUES (?, ?, ?)').run(pId, newToken, customerName);
              thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(result.lastInsertRowid) as any;
            }
          } catch (e) {
            console.error('Failed to fetch real project for email in page load:', e);
          }

          if (!thread) {
            // Fallback to demo project if no real project found
            const demoProjectId = 'DEMO-PROJECT-001';
            thread = db.prepare('SELECT * FROM threads WHERE projectId = ?').get(demoProjectId) as any;
            
            if (!thread) {
              const newToken = crypto.randomBytes(32).toString('hex');
              const result = db.prepare('INSERT INTO threads (projectId, token, customerName) VALUES (?, ?, ?)').run(demoProjectId, newToken, 'Demo Customer');
              thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(result.lastInsertRowid) as any;
            }
          }
        }
        
        if (!thread) {
          // Create a new thread on the fly for this project ID to allow access
          const newToken = crypto.randomBytes(32).toString('hex');
          try {
            projectData = await fetchJumptechProject(identifier);
            const customerName = `${projectData.firstName} ${projectData.lastName}`;
            const isoNow = new Date().toISOString();
            const result = db.prepare('INSERT INTO threads (projectId, token, customerName, projectData, projectDataUpdatedAt, createdAt, lastMessageAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(identifier, newToken, customerName, JSON.stringify(projectData), isoNow, isoNow, isoNow);
            thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(result.lastInsertRowid) as any;
            updateStats({ linksSent: 1 });
          } catch (err) {
            return res.status(404).json({ error: 'Invalid project ID.' });
          }
        }
      }

      if (!projectData) {
        // Check cache
        const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
        const now = new Date().getTime();
        const updatedAt = thread.projectDataUpdatedAt ? new Date(thread.projectDataUpdatedAt).getTime() : 0;

        if (thread.projectData && (now - updatedAt < CACHE_TTL)) {
          try {
            projectData = JSON.parse(thread.projectData);
          } catch (e) {
            console.error('Failed to parse cached projectData:', e);
          }
        }

        if (!projectData) {
          projectData = await fetchJumptechProject(thread.projectId);
          // Update cache
          db.prepare('UPDATE threads SET projectData = ?, projectDataUpdatedAt = ? WHERE id = ?')
            .run(JSON.stringify(projectData), new Date().toISOString(), thread.id);
        }
      }
      
      // Check for expiry: 24 hours after completedAt
      if (thread.expiresAt && new Date() > new Date(thread.expiresAt)) {
        return res.json({ expired: true });
      }

      // SAFE subset of project data
      const safeProject = {
        id: projectData.id,
        firstName: projectData.firstName,
        lastName: projectData.lastName,
        status: projectData.status,
        chargerType: projectData.chargerType,
        quoteStatus: projectData.quoteStatus,
        installedAt: thread.installedAt || projectData.installedAt,
      };

      const messages = db.prepare('SELECT senderType, body, createdAt FROM messages WHERE threadId = ? ORDER BY createdAt ASC').all(thread.id);

      updateStats({ totalOpens: 1 });

      res.json({
        threadId: thread.id,
        project: safeProject,
        messages,
        threadStatus: thread.status,
        expiresAt: thread.expiresAt,
        unreadForCustomer: !!thread.unreadForCustomer
      });
    } catch (err) {
      console.error('[API Error] /api/comms/page/:token:', err);
      res.status(500).json({ error: 'Failed to load project data.', details: err instanceof Error ? err.message : String(err) });
    }
  });

  // 2) postCustomerMessage(token, body)
  app.post("/api/comms/message/:token", async (req, res) => {
    try {
      const { token: identifier } = req.params;
      const { body } = req.body;

      if (!body || typeof body !== 'string') return res.status(400).json({ error: 'Message body required.' });

      let thread = db.prepare('SELECT * FROM threads WHERE token = ?').get(identifier) as any;
      if (!thread) {
        thread = db.prepare('SELECT * FROM threads WHERE projectId = ?').get(identifier) as any;
      }
      
      if (!thread) {
        // Create thread on the fly if it doesn't exist but project does
        try {
          const projectData: any = await fetchJumptechProject(identifier);
          const newToken = crypto.randomBytes(32).toString('hex');
          const customerName = `${projectData.firstName} ${projectData.lastName}`;
          const isoNow = new Date().toISOString();
          const result = db.prepare('INSERT INTO threads (projectId, token, customerName, createdAt, lastMessageAt) VALUES (?, ?, ?, ?, ?)').run(identifier, newToken, customerName, isoNow, isoNow);
          thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(result.lastInsertRowid) as any;
          updateStats({ linksSent: 1 });
        } catch (err) {
          return res.status(404).json({ error: 'Project not found.' });
        }
      }

      const category = categorizeMessage(body);
      const isoNow = new Date().toISOString();
      const result = db.prepare('INSERT INTO messages (threadId, senderType, body, category, createdAt) VALUES (?, ?, ?, ?, ?)').run(thread.id, 'customer', body, category, isoNow);
      const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid) as any;

      db.prepare("UPDATE threads SET lastMessageAt = ?, lastMessageText = ?, lastMessageSender = 'customer', needsResponse = 1, unreadForInstaller = 1 WHERE id = ?").run(isoNow, body, thread.id);
      
      const now = new Date();
      const hour = now.getHours();
      const isOutsideBusinessHours = hour < 8 || hour >= 17;

      // Check if this is the first message in the thread
      const msgCount = db.prepare('SELECT COUNT(*) as count FROM messages WHERE threadId = ?').get(thread.id) as any;
      
      updateStats({ 
        customerMessages: 1, 
        category,
        afterHoursMessages: isOutsideBusinessHours ? 1 : 0,
        conversationCount: msgCount.count === 1 ? 1 : 0
      });
      
      const updatedThread = db.prepare('SELECT * FROM threads WHERE id = ?').get(thread.id) as any;
      
      io.to(`thread-${thread.id}`).emit('new-message', message);
      io.to('admin-room').emit('thread-updated', updatedThread);

      // --- Closed Hours Auto-Response ---
      const lastAuto = updatedThread.lastAutoResponseAt ? new Date(updatedThread.lastAutoResponseAt) : null;
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const canSendAuto = !lastAuto || lastAuto < twelveHoursAgo;

      if (isOutsideBusinessHours && canSendAuto) {
        const autoBody = "Thanks for your message! Our team is currently offline. We'll respond during business hours.";
        const autoIsoNow = new Date().toISOString();
        const autoResult = db.prepare('INSERT INTO messages (threadId, senderType, body, autoGenerated, createdAt) VALUES (?, ?, ?, 1, ?)').run(thread.id, 'installer', autoBody, autoIsoNow);
        const autoMessage = db.prepare('SELECT * FROM messages WHERE id = ?').get(autoResult.lastInsertRowid) as any;
        
        db.prepare("UPDATE threads SET lastMessageAt = ?, lastMessageText = ?, lastMessageSender = 'installer', needsResponse = 0, unreadForCustomer = 1, lastAutoResponseAt = ? WHERE id = ?")
          .run(autoBody, autoIsoNow, autoIsoNow, thread.id);
        
        const finalThread = db.prepare('SELECT * FROM threads WHERE id = ?').get(thread.id) as any;
        
        io.to(`thread-${thread.id}`).emit('new-message', autoMessage);
        io.to('admin-room').emit('thread-updated', finalThread);
      }
      // ----------------------------------

      res.json({ success: true, message });
    } catch (err) {
      console.error('[API Error] /api/comms/message/:token:', err);
      res.status(500).json({ error: 'Failed to send message.', details: err instanceof Error ? err.message : String(err) });
    }
  });

  // 2.1) markAsReadCustomer(token)
  app.post("/api/comms/read/:token", async (req, res) => {
    try {
      const { token: identifier } = req.params;
      let thread = db.prepare('SELECT * FROM threads WHERE token = ?').get(identifier) as any;
      if (!thread) thread = db.prepare('SELECT * FROM threads WHERE projectId = ?').get(identifier) as any;
      if (!thread) return res.status(404).json({ error: 'Thread not found.' });

      db.prepare('UPDATE threads SET unreadForCustomer = 0 WHERE id = ?').run(thread.id);
      const updatedThread = db.prepare('SELECT * FROM threads WHERE id = ?').get(thread.id) as any;
      io.to('admin-room').emit('thread-updated', updatedThread);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to mark as read.' });
    }
  });

  // 3) postInternalMessage(threadId, body) - Admin only
  app.post("/api/admin/message/:threadId", async (req, res) => {
    try {
      const { threadId } = req.params;
      const { body } = req.body;
      const tId = Number(threadId);

      if (!body) return res.status(400).json({ error: 'Message body required.' });

      const thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(tId) as any;
      if (!thread) return res.status(404).json({ error: 'Thread not found.' });

      // Calculate response time
      const lastCustomerMsg = db.prepare("SELECT createdAt FROM messages WHERE threadId = ? AND senderType = 'customer' ORDER BY createdAt DESC LIMIT 1").get(tId) as any;
      let responseTime = null;
      if (lastCustomerMsg) {
        // Handle SQLite timestamp format (YYYY-MM-DD HH:MM:SS)
        const lastMsgDate = new Date(lastCustomerMsg.createdAt.replace(' ', 'T') + 'Z');
        responseTime = Math.floor((Date.now() - lastMsgDate.getTime()) / 1000);
      }

      const isoNow = new Date().toISOString();
      const result = db.prepare('INSERT INTO messages (threadId, senderType, body, responseTime, createdAt) VALUES (?, ?, ?, ?, ?)').run(tId, 'installer', body, responseTime, isoNow);
      const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid) as any;

      db.prepare("UPDATE threads SET lastMessageAt = ?, lastMessageText = ?, lastMessageSender = 'installer', needsResponse = 0, unreadForCustomer = 1 WHERE id = ?").run(isoNow, body, tId);
      
      updateStats({ 
        installerMessages: 1,
        responseTimeSum: responseTime || 0,
        responseTimeCount: responseTime ? 1 : 0
      });

      const updatedThread = db.prepare('SELECT * FROM threads WHERE id = ?').get(tId) as any;

      io.to(`thread-${tId}`).emit('new-message', message);
      io.to('admin-room').emit('thread-updated', updatedThread);

      res.json({ success: true, message });
    } catch (err) {
      console.error('[API Error] /api/admin/message/:threadId:', err);
      res.status(500).json({ 
        error: 'Failed to send message.', 
        details: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
    }
  });

  // 3.1) getThreadDataForAdmin(threadId) - Admin only
  app.get("/api/admin/thread/:threadId", async (req, res) => {
    const { threadId } = req.params;
    const thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(threadId) as any;
    if (!thread) return res.status(404).json({ error: 'Thread not found.' });

    try {
      // Mark as read for installer
      db.prepare('UPDATE threads SET unreadForInstaller = 0 WHERE id = ?').run(threadId);
      const updatedThread = db.prepare('SELECT * FROM threads WHERE id = ?').get(threadId) as any;
      io.to('admin-room').emit('thread-updated', updatedThread);

      const projectData: any = await fetchJumptechProject(thread.projectId);
      const messages = db.prepare('SELECT senderType, body, createdAt FROM messages WHERE threadId = ? ORDER BY createdAt ASC').all(thread.id);

      res.json({
        project: projectData,
        messages,
        thread: updatedThread
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load thread data.' });
    }
  });

  // 3.2) listAllThreads() - Admin only
  app.get("/api/admin/threads", async (req, res) => {
    try {
      const threads = db.prepare('SELECT * FROM threads ORDER BY lastMessageAt DESC').all();
      res.json(threads);
    } catch (err) {
      console.error('[API Error] /api/admin/threads:', err);
      res.status(500).json({ error: 'Failed to list threads.', details: err instanceof Error ? err.message : String(err) });
    }
  });

  // 3.3) getAdminStats()
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const { start, end } = req.query;
      
      let query = 'SELECT * FROM stats_daily';
      const params = [];
      
      if (start && end) {
        query += ' WHERE date >= ? AND date <= ?';
        params.push(start, end);
      } else {
        const today = new Date().toISOString().split('T')[0];
        query += ' WHERE date = ?';
        params.push(today);
      }
      
      const stats = db.prepare(query).all(...params) as any[];
      
      const needsResponseCount = db.prepare("SELECT COUNT(*) as count FROM threads WHERE needsResponse = 1 AND status = 'open'").get() as any;
      const openThreadsCount = db.prepare("SELECT COUNT(*) as count FROM threads WHERE status = 'open'").get() as any;

      res.json({
        stats,
        needsResponse: needsResponseCount.count,
        openThreads: openThreadsCount.count
      });
    } catch (err) {
      console.error('[API Error] /api/admin/stats:', err);
      res.status(500).json({ error: 'Failed to load stats.', details: err instanceof Error ? err.message : String(err) });
    }
  });

  // 3.4) trackEvent()
  app.post("/api/comms/event", (req, res) => {
    const { event, tileName, isUnique } = req.body;
    if (event === 'tile_click' && tileName) {
      updateStats({ tileClick: tileName });
    } else if (event === 'message_open') {
      updateStats({ messageOpens: 1 });
    } else if (event === 'page_open' && isUnique) {
      updateStats({ uniqueOpens: 1 });
    }
    res.json({ success: true });
  });

  // 4) markProjectComplete(threadId)
  app.post("/api/admin/complete/:threadId", async (req, res) => {
    try {
      const { threadId } = req.params;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      db.prepare("UPDATE threads SET status = 'closed', completedAt = ?, expiresAt = ? WHERE id = ?").run(now.toISOString(), expiresAt.toISOString(), threadId);
      
      const updatedThread = db.prepare('SELECT * FROM threads WHERE id = ?').get(threadId) as any;
      io.to('admin-room').emit('thread-updated', updatedThread);
      io.to(`thread-${threadId}`).emit('thread-closed', updatedThread);

      res.json({ success: true, thread: updatedThread });
    } catch (err) {
      res.status(500).json({ error: 'Failed to complete project.' });
    }
  });

  // 5) rotateToken(threadId)
  app.post("/api/admin/rotate-token/:threadId", async (req, res) => {
    const { threadId } = req.params;
    const newToken = crypto.randomBytes(32).toString('hex');
    // Reset expiry when rotating token to make it "active" again
    const result = db.prepare("UPDATE threads SET token = ?, expiresAt = NULL, completedAt = NULL, status = 'open' WHERE id = ?").run(newToken, threadId);
    if (result.changes === 0) return res.status(404).json({ error: 'Thread not found.' });
    res.json({ success: true, token: newToken });
  });

  // 6) close/reopen thread
  app.post("/api/admin/status/:threadId", async (req, res) => {
    const { threadId } = req.params;
    const { status } = req.body; // 'open' or 'closed'
    if (!['open', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });

    const result = db.prepare('UPDATE threads SET status = ? WHERE id = ?').run(status, threadId);
    if (result.changes === 0) return res.status(404).json({ error: 'Thread not found.' });
    res.json({ success: true });
  });

  // 7) setInstalledAt(projectId, installedAt)
  app.post("/api/admin/installed/:projectId", async (req, res) => {
    const { projectId } = req.params;
    const { installedAt } = req.body; // ISO string
    if (!installedAt) return res.status(400).json({ error: 'installedAt required.' });

    const expiresAt = new Date(new Date(installedAt).getTime() + 24 * 60 * 60 * 1000).toISOString();

    db.prepare('UPDATE threads SET installedAt = ?, expiresAt = ? WHERE projectId = ?').run(installedAt, expiresAt, projectId);
    res.json({ success: true, expiresAt });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Started successfully on http://0.0.0.0:${PORT}`);
    console.log(`[Server] Socket.io is ready`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
