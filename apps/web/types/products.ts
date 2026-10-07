export interface Product {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tickets: number;
  };
}

export interface CreateProductInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}
