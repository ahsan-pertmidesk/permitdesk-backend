import { Router } from 'express';
import {
  createProjectHandler,
  getProjectsHandler,
  getProjectByIdHandler,
  updateProjectHandler,
  deleteProjectHandler,
} from './project.controller';
import { validate, validateQueryParams } from '../../middlewares/validater';
import { isAuthenticate } from '../../middlewares/index';
import { createProjectSchema, updateProjectSchema, listProjectsQuerySchema } from './project.validator';

export const projectRoutes = Router();

projectRoutes.post(
  '/',
  isAuthenticate,
  validate(createProjectSchema),
  createProjectHandler
);

projectRoutes.get(
  '/',
  isAuthenticate,
  validateQueryParams(listProjectsQuerySchema),
  getProjectsHandler
);
projectRoutes.get('/:id', isAuthenticate, getProjectByIdHandler);
projectRoutes.put(
  '/:id',
  isAuthenticate,
  validate(updateProjectSchema),
  updateProjectHandler
);
projectRoutes.delete('/:id', isAuthenticate, deleteProjectHandler);

export default projectRoutes;
