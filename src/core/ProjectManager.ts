// نظام إدارة المشاريع المتقدم
export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  tags: string[];
  datasets: DatasetInfo[];
  analyses: AnalysisRecord[];
  reports: ReportRecord[];
  collaborators: Collaborator[];
  settings: ProjectSettings;
}

export interface DatasetInfo {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  rowCount: number;
  columnCount: number;
  uploadedAt: Date;
  dataTypes: Record<string, string>;
  qualityScore: number;
  lastModified: Date;
}

export interface AnalysisRecord {
  id: string;
  type: 'descriptive' | 'inferential' | 'regression' | 'correlation' | 'timeseries' | 'clustering' | 'pca';
  name: string;
  description: string;
  datasetId: string;
  parameters: Record<string, any>;
  results: Record<string, any>;
  createdAt: Date;
  duration: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface ReportRecord {
  id: string;
  name: string;
  type: 'summary' | 'detailed' | 'executive' | 'technical';
  format: 'pdf' | 'html' | 'docx' | 'xlsx';
  analyses: string[];
  createdAt: Date;
  fileSize: number;
  downloadUrl?: string;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  lastActive: Date;
}

export interface ProjectSettings {
  defaultAlpha: number;
  confidenceLevel: number;
  decimalPlaces: number;
  language: 'ar' | 'en';
  theme: 'light' | 'dark' | 'auto';
  autoSave: boolean;
  autoSaveInterval: number;
}

// مدير المشاريع
export class ProjectManager {
  private projects: Map<string, Project> = new Map();
  private currentProject: Project | null = null;
  private storageKey = 'statanalytica_projects';

  constructor() {
    this.loadFromStorage();
  }

  // تحميل المشاريع من التخزين
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        data.forEach((project: Project) => {
          this.projects.set(project.id, {
            ...project,
            createdAt: new Date(project.createdAt),
            updatedAt: new Date(project.updatedAt),
          });
        });
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }

  // حفظ المشاريع في التخزين
  private saveToStorage(): void {
    try {
      const data = Array.from(this.projects.values());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving projects:', error);
    }
  }

  // إنشاء مشروع جديد
  createProject(name: string, description: string = ''): Project {
    const project: Project = {
      id: this.generateId(),
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'current_user',
      status: 'draft',
      tags: [],
      datasets: [],
      analyses: [],
      reports: [],
      collaborators: [],
      settings: {
        defaultAlpha: 0.05,
        confidenceLevel: 95,
        decimalPlaces: 4,
        language: 'ar',
        theme: 'light',
        autoSave: true,
        autoSaveInterval: 30000,
      },
    };

    this.projects.set(project.id, project);
    this.currentProject = project;
    this.saveToStorage();
    return project;
  }

  // الحصول على جميع المشاريع
  getAllProjects(): Project[] {
    return Array.from(this.projects.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  // الحصول على مشروع بالمعرف
  getProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  // تحديث مشروع
  updateProject(id: string, updates: Partial<Project>): Project | null {
    const project = this.projects.get(id);
    if (!project) return null;

    const updated = {
      ...project,
      ...updates,
      updatedAt: new Date(),
    };

    this.projects.set(id, updated);
    if (this.currentProject?.id === id) {
      this.currentProject = updated;
    }
    this.saveToStorage();
    return updated;
  }

  // حذف مشروع
  deleteProject(id: string): boolean {
    const deleted = this.projects.delete(id);
    if (deleted) {
      if (this.currentProject?.id === id) {
        this.currentProject = null;
      }
      this.saveToStorage();
    }
    return deleted;
  }

  // إضافة مجموعة بيانات للمشروع
  addDataset(projectId: string, dataset: DatasetInfo): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;

    project.datasets.push(dataset);
    project.updatedAt = new Date();
    this.saveToStorage();
    return true;
  }

  // إضافة تحليل للمشروع
  addAnalysis(projectId: string, analysis: AnalysisRecord): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;

    project.analyses.push(analysis);
    project.updatedAt = new Date();
    project.status = 'in_progress';
    this.saveToStorage();
    return true;
  }

  // إضافة تقرير للمشروع
  addReport(projectId: string, report: ReportRecord): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;

    project.reports.push(report);
    project.updatedAt = new Date();
    this.saveToStorage();
    return true;
  }

  // البحث في المشاريع
  searchProjects(query: string): Project[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllProjects().filter(
      (project) =>
        project.name.toLowerCase().includes(lowerQuery) ||
        project.description.toLowerCase().includes(lowerQuery) ||
        project.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // تصفية المشاريع حسب الحالة
  filterByStatus(status: Project['status']): Project[] {
    return this.getAllProjects().filter((project) => project.status === status);
  }

  // إحصائيات المشاريع
  getStatistics(): {
    total: number;
    byStatus: Record<string, number>;
    totalAnalyses: number;
    totalReports: number;
    totalDatasets: number;
  } {
    const projects = this.getAllProjects();
    const byStatus: Record<string, number> = {
      draft: 0,
      in_progress: 0,
      completed: 0,
      archived: 0,
    };

    let totalAnalyses = 0;
    let totalReports = 0;
    let totalDatasets = 0;

    projects.forEach((project) => {
      byStatus[project.status]++;
      totalAnalyses += project.analyses.length;
      totalReports += project.reports.length;
      totalDatasets += project.datasets.length;
    });

    return {
      total: projects.length,
      byStatus,
      totalAnalyses,
      totalReports,
      totalDatasets,
    };
  }

  // تصدير مشروع
  exportProject(id: string): string | null {
    const project = this.projects.get(id);
    if (!project) return null;
    return JSON.stringify(project, null, 2);
  }

  // استيراد مشروع
  importProject(data: string): Project | null {
    try {
      const project = JSON.parse(data) as Project;
      project.id = this.generateId();
      project.createdAt = new Date();
      project.updatedAt = new Date();
      this.projects.set(project.id, project);
      this.saveToStorage();
      return project;
    } catch (error) {
      console.error('Error importing project:', error);
      return null;
    }
  }

  // توليد معرف فريد
  private generateId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // المشروع الحالي
  getCurrentProject(): Project | null {
    return this.currentProject;
  }

  setCurrentProject(id: string): boolean {
    const project = this.projects.get(id);
    if (project) {
      this.currentProject = project;
      return true;
    }
    return false;
  }
}

// تصدير instance واحد
export const projectManager = new ProjectManager();
