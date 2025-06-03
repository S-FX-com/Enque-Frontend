export enum ConditionType {
  DESCRIPTION = "DESCRIPTION",
  NOTE = "NOTE", 
  USER = "USER",
  AGENT = "AGENT",
  COMPANY = "COMPANY",
  PRIORITY = "PRIORITY",
  CATEGORY = "CATEGORY"
}

export enum ConditionOperator {
  EQL = "eql",
  NEQL = "neql", 
  CON = "con",
  NCON = "ncon"
}

export enum ActionType {
  SET_AGENT = "SET_AGENT",
  SET_PRIORITY = "SET_PRIORITY",
  SET_STATUS = "SET_STATUS",
  SET_TEAM = "SET_TEAM"
}

export interface AutomationCondition {
  id: number;
  automation_id: number;
  condition_type: ConditionType;
  condition_operator: ConditionOperator;
  condition_value?: string;
  created_at: string;
}

export interface AutomationConditionCreate {
  condition_type: ConditionType;
  condition_operator?: ConditionOperator;
  condition_value?: string;
}

export interface AutomationAction {
  id: number;
  automation_id: number;
  action_type: ActionType;
  action_value?: string;
  created_at: string;
}

export interface AutomationActionCreate {
  action_type: ActionType;
  action_value?: string;
}

export interface Automation {
  id: number;
  name: string;
  workspace_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: number;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

export interface AutomationCreate {
  name: string;
  workspace_id: number;
  is_active?: boolean;
  conditions: AutomationConditionCreate[];
  actions: AutomationActionCreate[];
}

export interface AutomationUpdate {
  name?: string;
  is_active?: boolean;
  conditions?: AutomationConditionCreate[];
  actions?: AutomationActionCreate[];
} 