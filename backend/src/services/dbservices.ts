import { CustomError } from '../middlewares/customError';
import { PrismaClient } from '@prisma/client';

const prisma: PrismaClient = new PrismaClient();

// Helper function to safely access Prisma models
// Prisma models are accessed with lowercase names (e.g., 'user' not 'User')
function getModel(modelName: string) {
  // Convert model name to lowercase (Prisma convention)
  const lowerModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const model = (prisma as any)[lowerModelName];
  if (!model) {
    // Try the original name as fallback
    const originalModel = (prisma as any)[modelName];
    if (originalModel) {
      return originalModel;
    }
    // Get available models for error message
    const availableModels = Object.keys(prisma)
      .filter(key => !key.startsWith('$') && !key.startsWith('_') && typeof (prisma as any)[key] === 'object')
      .join(', ');
    throw new Error(
      `Prisma model "${modelName}" (tried as "${lowerModelName}") not found. Available models: ${availableModels || 'none'}`
    );
  }
  return model;
}

export class DBQuery {
  // private prisma: PrismaClient;
  private model: string;

  constructor(model: string) {
    // this.prisma = new PrismaClient();
    this.model = model;
  }

  // Helper method to get the typed model with validation
  private getModel() {
    return getModel(this.model);
  }
  // check duplicates
  async checkDuplicate(query: any) {
    let data = await this.getModel().findUnique({
      where: query,
    });
    if (!data) {
      throw new CustomError(`${this.model} not found`, 404, false);
    }
    return data;
  }
  // upsert function
  async upsertRecord(query: any, update: any, create: any) {
    await this.getModel().upsert({
      where: query,
      update: update,
      create: create,
    });
  }
  async checkDuplicateWithNonUnique(query: any, message?: string) {
    let data = await this.getModel().findFirst({
      where: { ...query, deletedAt: null },
    });
    if (data) {
      throw new CustomError(
        message || `${this.model} already exists`,
        409,
        false,
      );
    }
  }

  async checkDuplicateWithNonUniqueWithDeleted(query: any, message?: string) {
    let data = await this.getModel().findFirst({
      where: { ...query },
    });
    if (data) {
      throw new CustomError(
        message || `${this.model} already exists`,
        409,
        false,
      );
    }
  }

  async findOne(query: any, include?: any, message?: string) {
    let options: any = {
      where: { ...query, deletedAt: null },
    };

    if (include) {
      options.include = include;
    }
    // @ts-ignore
    const data = await prisma[this.model].findFirst(options);
    if (data) {
      return data;
    } else {
      throw new CustomError(message || `${this.model} not found`, 404, false);
    }
  }

  async findOneByQuery(query: any, include?: any, select?: any, orderBy?: any) {
    let options: any = {
      where: { ...query },
    };

    if (include) {
      options.include = include;
    }
    if (select) {
      options.select = select;
    }
    if (orderBy) {
      options.orderBy = orderBy;
    }

    // @ts-ignore
    const data = await prisma[this.model].findFirst(options);
    return data;
  }

  async findUser(query: any, include?: any) {
    let options: any = {
      where: { ...query, deletedAt: null },
    };

    // @ts-ignore
    const data = await prisma[this.model].findFirst(options);

    return data;
  }

  async findOneWithSelect(
    query: Record<string, any>,
    include?: any,
    select?: Record<string, any>,
    message?: string,
  ) {
    const options: Record<string, any> = {
      where: { ...query, deletedAt: null },
      ...(include && { include }),
      ...(select && { select }),
    };

    // @ts-ignore
    const data = await prisma[this.model].findFirst(options);

    if (data) {
      return data;
    } else {
      throw new CustomError(message || `${this.model} not found`, 404, false);
    }
  }

  async create(data: any) {
    // @ts-ignore
    let response = await prisma[this.model].create({
      data,
    });
    return (response = {
      id: response.id,
    });
  }

  async createData(data: any) {
    // @ts-ignore
    let response = await prisma[this.model].create({
      data,
    });
    return response;
  }

  async createMany(data: any[]) {
    // @ts-ignore
    await prisma[this.model].createMany({
      data,
      skipDuplicates: true,
    });
  }

  async createManyItems(data: any[]) {
    const model = prisma[this.model as keyof typeof prisma] as any;

    const created = await prisma.$transaction(
      data.map((item) =>
        model.create({
          data: item,
          select: { id: true },
        }),
      ),
    );

    return created.map((record: any) => record.id);
  }

  async findOnedoc(query: any, orderBy?: any, skip?: number) {
    // @ts-ignore
    const data = await prisma[this.model].findFirst({
      where: query,
      ...(orderBy && { orderBy }),
      ...(typeof skip === 'number' && { skip }),
    });
    return data;
  }

  async findByIdAndUpdate(id: number | string, data: any) {
    // @ts-ignore
    let response = await prisma[this.model].update({
      where: { id },
      data,
    });
    if (response) {
      return response;
    } else {
      throw new CustomError(`${this.model} not found`, 404, false);
    }
  }

  async findByQueryAndUpdate(query: any, data: any) {
    // @ts-ignore
    let update = await prisma[this.model].update({
      where: { ...query, deletedAt: null },
      data,
    });
  }

  async findandUpdate(query: any, data: any) {
    // @ts-ignore
    
    let update = await prisma[this.model].update({
      where: { ...query, deletedAt: null },
      data,
    });
  }
  async getByQueryAndUpdate(query: any, data: any) {
    // @ts-ignore
    return await prisma[this.model].update({
      where: { ...query },
      data,
    });
  }

  async aggregation(query: any, aggregationOptions: any) {
    // @ts-ignore
    return await prisma[this.model].aggregate({
      where: query,
      ...aggregationOptions,
    });
  }

  async groupBy(query: any, groupByOptions: any) {
    // @ts-ignore
    return await prisma[this.model].groupBy({
      where: query,
      ...groupByOptions,
    });
  }

  async getAllWithPagination(
    query: any,
    limit: number,
    page: number,
    select?: any,
    include?: any,
    sort?: { [key: string]: 'asc' | 'desc' },
  ) {
    limit = limit ? parseInt(limit.toString(), 10) : 12;
    page = page ? parseInt(page.toString(), 10) : 1;

    const skip = (page - 1) * limit;
    const options: any = {
      where: { ...query, deletedAt: null },
      skip,
      take: limit,
    };

    if (include) {
      options.include = include;
    }
    if (select) {
      options.select = select;
    }
    if (sort) {
      options.orderBy = sort;
    }
    // @ts-ignore
    const result = await prisma[this.model].findMany(options);
    // @ts-ignore
    const count = await prisma[this.model].count({
      where: { ...query, deletedAt: null },
    });
    return {
      pages: Math.ceil(count / limit),
      total: count,
      data: result,
    };
  }

  async getAllPagination(
    query: any,
    limit: number,
    page: number,
    select?: any,
    include?: any,
    sort?: { [key: string]: 'asc' | 'desc' },
  ) {
    limit = limit ? parseInt(limit.toString(), 10) : 12;
    page = page ? parseInt(page.toString(), 10) : 1;

    const skip = (page - 1) * limit;
    const options: any = {
      where: { ...query },
      skip,
      take: limit,
    };

    if (include) {
      options.include = include;
    }
    if (select) {
      options.select = select;
    }
    if (sort) {
      options.orderBy = sort;
    }
    // @ts-ignore
    const result = await prisma[this.model].findMany(options);
    // @ts-ignore
    const count = await prisma[this.model].count({
      where: { ...query },
    });
    return {
      pages: Math.ceil(count / limit),
      total: count,
      data: result,
    };
  }

  async getAllWithPaginationAndSelect(
    query: any,
    limit: number,
    page: number,
    select?: any,
    include?: any,
    sort?: { [key: string]: 'asc' | 'desc' },
  ) {
    limit = limit ? parseInt(limit.toString(), 10) : 1;
    page = page ? parseInt(page.toString(), 10) : 1;

    const skip = (page - 1) * limit;
    const options: any = {
      where: { ...query, deletedAt: null },
      skip,
      take: limit,
    };

    if (select) {
      options.select = select;
    }

    if (include) {
      options.include = include;
    }

    if (sort) {
      options.orderBy = sort;
    }
    // @ts-ignore
    const result = await prisma[this.model].findMany(options);
    // @ts-ignore
    const count = await prisma[this.model].count({
      where: { ...query, deletedAt: null },
    });
    return {
      pages: Math.ceil(count / limit),
      total: count,
      data: result,
    };
  }

  async findByIdAndDelete(query: any) {
    // @ts-ignore
    return await prisma[this.model].update({
      where: query,
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async getByIdAndDelete(query: any, data: any) {
    // @ts-ignore
    return await prisma[this.model].update({
      where: query,
      data,
    });
  }

  async findAndDelete(query: any) {
    // @ts-ignore
    return await prisma[this.model].delete({
      where: query,
    });
  }

  async deleteMany(query: any) {
    // @ts-ignore
    return await prisma[this.model].deleteMany({
      where: query,
    });
  }

  async softDeleteMany(query: any, data: any) {
    // @ts-ignore
    return await prisma[this.model].updateMany({
      where: query,
      data,
    });
  }

  async deleteManyByIds(ids: string[]) {
    // @ts-ignore
    return await prisma[this.model].deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  async findMany(
    query: any,
    sort: any = {},
    select?: any,
    include?: any,
    skip?: number,
    distinct?: string[],
    omit?: any,
    limit?: number,
  ) {
    const options: any = {
      where: { ...query, deletedAt: null },
      orderBy: sort,
      omit: omit,
    };

    if (select) {
      options.select = select;
    }
    if (include) {
      options.include = include;
    }
    if (skip !== undefined) {
      options.skip = skip;
    }
    if (distinct && distinct.length > 0) {
      options.distinct = distinct;
    }
    if (omit) {
      options.omit = omit;
    }
    if (typeof skip === 'number') {
      options.skip = skip;
    }
    if (typeof limit === 'number') {
      options.take = limit;
    }
    // @ts-ignore
    return await prisma[this.model].findMany(options);
  }

  async getMany(
    query: any,
    sort: any = {},
    select?: any,
    include?: any,
    skip?: number,
    distinct?: string[],
  ) {
    // @ts-ignore

    const options: any = {
      where: { ...query },
      orderBy: sort,
    };

    if (select) {
      options.select = select;
    }
    if (include) {
      options.include = include;
    }
    if (skip !== undefined) {
      options.skip = skip;
    }
    if (distinct && distinct.length > 0) {
      options.distinct = distinct;
    }
    // @ts-ignore
    return await prisma[this.model].findMany(options);
  }

  async findManyByManyQuery(query: any) {
    // @ts-ignore
    const data = await prisma[this.model].findMany(query);

    return data;
  }

  async findUnique(query: any, include?: any) {
    const options: any = { where: query };

    if (include) {
      options.include = include;
    }
    // @ts-ignore
    return prisma[this.model].findUnique(options);
  }

  async count(query: any) {
    // @ts-ignore
    let data = await prisma[this.model].count({
      where: query,
    });
    if (!data) {
      return (data = 1);
    } else {
      return data;
    }
  }
  async countWithDelete(query: any) {
    // @ts-ignore
    let data = await prisma[this.model].count({
      where: { ...query, deletedAt: null },
    });
    if (!data) {
      return (data = 0);
    } else {
      return data;
    }
  }

  async updateMany(query: any, data: any) {
    // @ts-ignore
    return await prisma[this.model].updateMany({
      where: query,
      data,
    });
  }

  async updateManyByIds(ids: string[], data: any) {
    // @ts-ignore
    return await prisma[this.model].updateMany({
      where: { id: { in: ids } },
      data,
    });
  }

  async upsert(query: any, createData: any, updateData: any) {
    // @ts-ignore
    return await prisma[this.model].upsert({
      where: query,
      create: createData,
      update: updateData,
    });
  }
}
