// Service container for dependency injection
import type {
  IWorkflow,
  IVersionChecker,
  IFontDownloader,
  IFontSubsetter,
  ICSSGenerator,
  IDocsGenerator,
} from '@/core/interfaces/index.js';

export class ServiceContainer {
  private static instance: ServiceContainer;
  private services = new Map<string, unknown>();

  private constructor() {}

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  resolve<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service ${key} not found in container`);
    }
    return service as T;
  }

  // Type-safe service getters
  getVersionChecker(): IVersionChecker {
    return this.resolve<IVersionChecker>('versionChecker');
  }

  getFontDownloader(): IFontDownloader {
    return this.resolve<IFontDownloader>('fontDownloader');
  }

  getFontSubsetter(): IFontSubsetter {
    return this.resolve<IFontSubsetter>('fontSubsetter');
  }

  getCSSGenerator(): ICSSGenerator {
    return this.resolve<ICSSGenerator>('cssGenerator');
  }

  getDocsGenerator(): IDocsGenerator {
    return this.resolve<IDocsGenerator>('docsGenerator');
  }

  getWorkflow(): IWorkflow {
    return this.resolve<IWorkflow>('workflow');
  }

  // Register all services at once
  registerServices(services: {
    versionChecker: IVersionChecker;
    fontDownloader: IFontDownloader;
    fontSubsetter: IFontSubsetter;
    cssGenerator: ICSSGenerator;
    docsGenerator: IDocsGenerator;
    workflow: IWorkflow;
  }): void {
    Object.entries(services).forEach(([key, service]) => {
      this.register(key, service);
    });
  }

  // Clear all services (useful for testing)
  clear(): void {
    this.services.clear();
  }
}
