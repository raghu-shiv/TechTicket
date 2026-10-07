import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';
import type { OrganizationContext } from '../../common/organization/organization.types';

interface CreateProductInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

interface UpdateProductInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

@Injectable()
export class ProductsService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(context: OrganizationContext) {
    return this.database.product.findMany({
      where: {
        organizationId: context.organizationId,
      },
      orderBy: [
        {
          isActive: 'desc',
        },
        {
          name: 'asc',
        },
      ],
      select: {
        id: true,
        organizationId: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });
  }

  async findOne(context: OrganizationContext, productId: string) {
    const product = await this.database.product.findFirst({
      where: {
        id: productId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async create(context: OrganizationContext, input: CreateProductInput) {
    const name = input.name.trim();

    try {
      return await this.database.product.create({
        data: {
          organizationId: context.organizationId,
          name,
          description: input.description?.trim() || null,
          isActive: input.isActive ?? true,
        },
        select: {
          id: true,
          organizationId: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A product with this name already exists in this organization',
        );
      }

      throw error;
    }
  }

  async update(
    context: OrganizationContext,
    productId: string,
    input: UpdateProductInput,
  ) {
    await this.findOne(context, productId);

    if (
      input.name === undefined &&
      input.description === undefined &&
      input.isActive === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    const name = input.name === undefined ? undefined : input.name.trim();

    try {
      return await this.database.product.update({
        where: {
          id: productId,
        },
        data: {
          ...(name !== undefined && {
            name,
          }),

          ...(input.description !== undefined && {
            description: input.description.trim() || null,
          }),

          ...(input.isActive !== undefined && {
            isActive: input.isActive,
          }),
        },
        select: {
          id: true,
          organizationId: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A product with this name already exists in this organization',
        );
      }

      throw error;
    }
  }

  async remove(context: OrganizationContext, productId: string) {
    const product = await this.findOne(context, productId);

    /*
     * Keep products as historical reporting dimensions.
     * Deleting a product would leave existing ticket analytics
     * without their original product classification.
     *
     * Deactivation is therefore the supported lifecycle operation.
     */
    if (product.isActive) {
      throw new ConflictException(
        'Active products cannot be deleted. Deactivate the product first.',
      );
    }

    return this.database.product.delete({
      where: {
        id: productId,
      },
      select: {
        id: true,
      },
    });
  }
}
