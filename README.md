🌸 Flower Marketplace (Monorepo)
A comprehensive, high-end Multi-vendor E-commerce platform dedicated to the floral industry. Built with a Premium Operational UX approach and a robust SEO-first architecture.

🚀 Overview
The Flower Marketplace is an enterprise-grade ecosystem designed to bridge the gap between premium florists and customers. It features a sophisticated administrative engine, a dedicated vendor workspace, and a high-performance storefront optimized for instant delivery and luxury floral commerce.

🏗 Project Structure
This repository is managed as a Monorepo using npm workspaces, ensuring seamless integration and shared logic across all layers:

apps/storefront: Customer-facing shop (Next.js) - SEO-optimized with structured data.
apps/admin-panel: Central management hub (React + Vite) - Focused on editorial workflows and operations.
apps/vendor-panel: Seller-specific dashboard (React + Vite) - For inventory and settlement management.
apps/backend: Core API services (NestJS) - Scalable architecture with PostgreSQL & Prisma.
packages/frontend-core: Shared UI library, themes, and cross-panel business logic.
packages/database: Centralized schema management and database assets.
🛠 Tech Stack
Backend
Framework: NestJS (Node.js)
Database: PostgreSQL
ORM: Prisma
Auth: JWT & OTP-based authentication strategies
Validation: Type-safe DTOs with Zod/Class-validator
Frontend
Frameworks: Next.js (SSR for Storefront), React + Vite (Panels)
State Management: TanStack Query (React Query) for efficient caching
Design System: Custom Premium UI tokens with responsive-first architecture
Date/Time: Native Jalali (Solar Hijri) support for localized operations
✨ Key Features
Multi-vendor Ecosystem: Independent balance management, product isolation, and vendor-specific shipping rules.
Product Editorial Workflow: A rigorous “Review-to-Publish” pipeline ensuring high-quality content and SEO compliance.
Advanced Financial Engine: Real-time settlement tracking, Held Balance logic for after-sales support, and automated wallet management.
Luxury UX/UI: Premium design language tailored for floral aesthetics, featuring smooth transitions and high-performance tables.
SEO-first Infrastructure: Built-in support for OpenGraph, JSON-LD structured data, and optimized taxonomy linking.
💻 Getting Started
Prerequisites
Node.js (Latest LTS)
PostgreSQL
Installation
Clone the repository and install dependencies:
bash
   npm install
Environment Setup:

Create a .env file in the root based on .env.example.

Run in Development Mode:

bash
   # Run all workspaces simultaneously
   npm run dev:all
📄 Development Guidelines
Commit Strategy: Follows Conventional Commits (e.g., feat(admin-panel): ...).
Code Quality: Strictly TypeScript with ESLint and Prettier enforcement.
Design Principles: System-first design using shared tokens in frontend-core.
Developed with a focus on reliability, scalability, and premium user experience.