/** Step option as returned from DB (with stepOption relation) */
export interface StepOptionSelect {
  stepOptionArray: string[];
}

/** Step with optional dropdown options - for workflow question response */
export interface StepWithOptions {
  id: string;
  name: string;
  workflowId: string;
  promptText: string;
  questionOptions: string[];
  clientAnswerType: string | null;
  requiredPreviousStepAns: boolean | null;
  no: number;
  stepOption: StepOptionSelect[];
}

/** Workflow step response sent to client */
export interface WorkFlowStepResponse {
  text: string;
  stepId: string;
  workflowId: string;
  stepName: string;
  questionOptions: string[];
  clientAnswerType: string | null;
  questionDropDown: StepOptionSelect[];
}

/** Result when workflow has no next step (completed) */
export interface WorkflowCompletedResult {
  workflowCompleted: true;
  text: string;
  workflow: true;
}

/** Result when there is a next step */
export interface WorkflowStepResult {
  workFlowStepResponse: WorkFlowStepResponse;
}

export type GetInitialWorkFlowQuestionResult =
  | WorkflowCompletedResult
  | WorkflowStepResult;

/** Input for saving a workflow answer */
export interface SaveInitialWorkFlowAnsInput {
  userId: string | null;
  stepId: string;
  workflowId: string;
  conversationId: string;
  clientAnswer: string;
  aiQuestion: string;
  fileUrls?: FileUrlInput | null;
}

export interface FileUrlInput {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileExtension: string;
}

/** Input for creating a workflow with steps */
export interface CreateWorkFlowStepInput {
  no: number;
  name: string;
  promptText: string;
  questionOptions: string[];
  clientAnswerType: string;
  stepOptionArray?: string[];
}

export interface CreateWorkFlowInput {
  name: string;
  status?: string;
  steps: CreateWorkFlowStepInput[];
}

/** NYC borough – allowed values for address extraction */
export type Borough = 'Manhattan' | 'Bronx' | 'Brooklyn' | 'Queens' | 'Staten Island';

/** Building characteristics extracted from document */
export interface BuildingCharacteristics {
  buildingHeight: number | null;
  numberOfStories: number | null;
  buildingArea: number | null;
  numberOfDwellingUnits: number;
  numberOfSleepingUnits: number;
}

/** Contractor entry in extracted data */
export interface ContractorEntry {
  type: string;
  name: string;
  address: string;
}

/** Full document extraction result – matches AI output schema */
export interface DocumentExtractionResult {
  address: string | null;
  location: string | null;
  houseNumber: string | null;
  streetName: string | null;
  borough: Borough | null;
  pin: string | null;
  block: string | null;
  lot: string | null;
  typeOfWork: string | null;
  scopeAndDescriptionOfWork: string | null;
  areaOfWork: string | null;
  descriptionOfWork: string | null;
  existingZoningUse: string | null;
  proposedZoningUse: string | null;
  buildingCode: string | null;
  energyCode: string | null;
  structuralPeerReview: string | null;
  landAreaSqFt: number | null;
  floorArea: number | null;
  typeOfWorkBuildingRehabilitation: string[] | null;
  complianceDetails: string[] | null;
  occupancyClassifications: string[] | null;
  occupancySeparations: string | null;
  constructionType: string | null;
  buildingCharacteristics: BuildingCharacteristics | null;
  contractors: ContractorEntry[] | null;
}

/** State/city extraction result (e.g. from getJsonResponseFromClientPrompt) */
export interface StateCityExtractionResult {
  state: string | null;
  city: string | null;
}

/** Result of saving extracted fields to DB */
export interface SavedExtractionEntry {
  key: string;
  saved: boolean;
  reason?: string;
}

/** Upload document result */
export interface UploadDocumentResult {
  extractedData: DocumentExtractionResult;
}

/** Get JSON from client prompt result */
export interface GetJsonFromClientPromptResult {
  extractedData: StateCityExtractionResult;
  savedResults: SavedExtractionEntry[];
}
