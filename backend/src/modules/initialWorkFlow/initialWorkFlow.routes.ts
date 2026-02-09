import { Router } from 'express';
import {
  getInitialWorkFlowQuestion,SaveInitialWorkFlowAns,createWorkFlow,uploadDoc
} from './initialWorkFlow.controller';
import { validate } from '../../middlewares/validater';
import { isAuthenticate ,isAuthorize} from '../../middlewares/index';

export const initialWorkFlowQuestionRoutes = Router();



// Get all Conversations
initialWorkFlowQuestionRoutes.get('/without-auth', getInitialWorkFlowQuestion);

initialWorkFlowQuestionRoutes.get('/',isAuthenticate, getInitialWorkFlowQuestion);

initialWorkFlowQuestionRoutes.post('/',isAuthenticate, SaveInitialWorkFlowAns);


initialWorkFlowQuestionRoutes.post('/crete-work-flow-and-step', createWorkFlow);
initialWorkFlowQuestionRoutes.post('/upload-file', isAuthenticate,uploadDoc);


export default initialWorkFlowQuestionRoutes;

