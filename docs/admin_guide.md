# GPM: Admin Guide

As an Admin, you have full control over the GenArtML Project Manager (GPM). You can manage all projects, oversee all team members, and manage access rights.

## 1. Logging In
- Navigate to the main portal URL.
- Enter your Admin username (e.g., `admin1`) and password.
- You will be greeted by the full dashboard showing all projects across the company.

## 2. Managing Users (Team Members)
Only Admins have access to the **Manage Users** tab at the bottom of the sidebar.
- **Creating a Member**: Click "Create Member". Enter their username, display name, email, and a secure password. Set their role to "member".
- **Assigning Projects**: Check the boxes next to the projects this team member is allowed to see and work on. *If a project is not checked, it will be invisible to them.*
- **Feature Access**: Toggle which features the member can use. The system is smart—if you give them "Tasks" access but forget to give them "Projects" access, it will warn you to enable both.
- **Editing/Deleting**: You can change a member's access at any time by clicking the Edit icon next to their name.

## 3. Creating and Managing Projects
- Open the Command Palette (`Cmd+K` or `Ctrl+K`) and select **New Project**, or click **New Project** in the Projects tab.
- Fill in the project details, including the client's name and the **Client Portal Password**. 
- Add the **Client Email** so they can receive automatic email updates when their tickets are resolved.

## 4. AI Radar & Scheduling
- GPM's AI watches all projects for deadline collisions or overloaded team members.
- If conflicts are detected, you will see pending suggestions in the **AI Suggestions** tab.
- Review the suggestions (e.g., "Reschedule Module X to next week") and click **Apply** to have the AI automatically restructure the timeline.

## 5. Handling Client Tickets
- When a client submits a ticket via their portal, it appears in your **Client Tickets** tab.
- You will receive an email notification at `daksh@genartml.com`.
- You can review the ticket, adjust its priority, and either **Resolve** it immediately (which emails the client) or click **Convert to Task** to add it to the team's workload.
