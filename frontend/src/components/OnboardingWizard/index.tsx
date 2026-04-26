import React, { useState } from 'react';
import { useStore } from '../../store/useStore';

type WizardStep = 'project' | 'requirements' | 'plan' | 'strategy' | 'suite' | 'done';

const STEPS: { id: WizardStep; label: string; icon: string; desc: string }[] = [
  { id: 'project',      label: 'Project',      icon: '📁', desc: 'Name your project' },
  { id: 'requirements', label: 'Requirements', icon: '📝', desc: 'Define what you need to test' },
  { id: 'plan',         label: 'Test Plan',    icon: '📋', desc: 'Set scope and criteria' },
  { id: 'strategy',     label: 'Strategy',     icon: '🗺', desc: 'Choose your approach' },
  { id: 'suite',        label: 'Test Suite',   icon: '🧪', desc: 'Create your first suite' },
  { id: 'done',         label: 'Done',         icon: '✓',  desc: 'All set!' },
];

const STEP_IDS = STEPS.map(s => s.id);

function ProgressBar({ current }: { current: WizardStep }) {
  const idx = STEP_IDS.indexOf(current);
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={step.id}>
            <div className={`flex flex-col items-center gap-1 ${i === STEPS.length - 1 ? '' : 'flex-1'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                ${done  ? 'bg-blue-600 text-white'
                : active ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900'
                :          'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
              >
                {done ? '✓' : step.icon}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap hidden sm:block
                ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 rounded transition-colors ${done ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StepProject({ onNext, onSkip }: { onNext: (name: string, desc: string) => void; onSkip: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create a project</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Projects group your test suites, plans, and requirements together.</p>
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Project name *</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onNext(name.trim(), desc)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. E-Commerce Checkout"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="What does this project test?"
          />
        </div>
      </div>
      <div className="flex justify-between pt-2">
        <button onClick={onSkip} className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          Skip setup →
        </button>
        <button
          onClick={() => name.trim() && onNext(name.trim(), desc)}
          disabled={!name.trim()}
          className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function StepRequirements({ onNext, onBack }: { onNext: (reqs: { title: string; description: string }[]) => void; onBack: () => void }) {
  const [rows, setRows] = useState([{ title: '', description: '' }]);

  const addRow = () => setRows(r => [...r, { title: '', description: '' }]);
  const removeRow = (i: number) => setRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: 'title' | 'description', val: string) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const valid = rows.some(r => r.title.trim());

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add requirements</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">List the features or behaviours you need to validate. You can add more later.</p>
      </div>
      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1 flex flex-col gap-1">
              <input
                value={row.title}
                onChange={e => updateRow(i, 'title', e.target.value)}
                placeholder={`Requirement ${i + 1} title`}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={row.description}
                onChange={e => updateRow(i, 'description', e.target.value)}
                placeholder="Description (optional)"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {rows.length > 1 && (
              <button onClick={() => removeRow(i)} className="mt-1 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors text-sm flex-shrink-0">✕</button>
            )}
          </div>
        ))}
      </div>
      <button onClick={addRow} className="self-start text-sm text-blue-600 dark:text-blue-400 hover:underline">
        + Add another
      </button>
      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
          ← Back
        </button>
        <div className="flex gap-2">
          <button onClick={() => onNext([])} className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Skip
          </button>
          <button
            onClick={() => onNext(rows.filter(r => r.title.trim()))}
            disabled={!valid}
            className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

function StepPlan({ onNext, onBack }: { onNext: (plan: { name: string; objective: string; scope: string; entryCriteria: string; exitCriteria: string } | null) => void; onBack: () => void }) {
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [scope, setScope] = useState('');
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create a test plan</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Define the objective, scope, and criteria for this testing effort.</p>
      </div>
      <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
        {[
          { label: 'Plan name *', val: name, set: setName, ph: 'Sprint 12 Test Plan' },
          { label: 'Objective', val: objective, set: setObjective, ph: 'Verify all checkout flows work correctly' },
          { label: 'Scope', val: scope, set: setScope, ph: 'All pages under /checkout and /payment' },
          { label: 'Entry criteria', val: entry, set: setEntry, ph: 'Feature branch merged to staging' },
          { label: 'Exit criteria', val: exit, set: setExit, ph: '90%+ pass rate, no critical failures' },
        ].map(f => (
          <div key={f.label}>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{f.label}</label>
            <input
              value={f.val}
              onChange={e => f.set(e.target.value)}
              placeholder={f.ph}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">← Back</button>
        <div className="flex gap-2">
          <button onClick={() => onNext(null)} className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Skip</button>
          <button
            onClick={() => onNext(name.trim() ? { name: name.trim(), objective, scope, entryCriteria: entry, exitCriteria: exit } : null)}
            disabled={!name.trim()}
            className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

function StepStrategy({ onNext, onBack }: { onNext: (strategy: { name: string; approach: string; testLevels: string[]; tools: string } | null) => void; onBack: () => void }) {
  const [name, setName] = useState('');
  const [approach, setApproach] = useState('');
  const [tools, setTools] = useState('Playwright, Jest');
  const [levels, setLevels] = useState<string[]>(['system']);

  const toggleLevel = (l: string) =>
    setLevels(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);

  const LEVELS = ['unit', 'integration', 'system', 'acceptance'];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Define test strategy</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Describe your overall testing approach and the levels of testing involved.</p>
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Strategy name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. End-to-End Strategy"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Approach</label>
          <textarea
            value={approach}
            onChange={e => setApproach(e.target.value)}
            rows={2}
            placeholder="Describe the testing approach…"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Test levels</label>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map(l => (
              <button
                key={l}
                onClick={() => toggleLevel(l)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-colors
                  ${levels.includes(l)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tools</label>
          <input
            value={tools}
            onChange={e => setTools(e.target.value)}
            placeholder="Playwright, Jest, …"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">← Back</button>
        <div className="flex gap-2">
          <button onClick={() => onNext(null)} className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Skip</button>
          <button
            onClick={() => onNext(name.trim() ? { name: name.trim(), approach, testLevels: levels, tools } : null)}
            disabled={!name.trim()}
            className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

function StepSuite({ onNext, onBack }: { onNext: (suite: { name: string; description: string } | null) => void; onBack: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create a test suite</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A test suite holds your individual Playwright tests. You can create more from the Test Builder.</p>
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Suite name *</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onNext({ name: name.trim(), description: desc })}
            placeholder="e.g. Checkout Flow"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="What does this suite test?"
          />
        </div>
      </div>
      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">← Back</button>
        <div className="flex gap-2">
          <button onClick={() => onNext(null)} className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Skip</button>
          <button
            onClick={() => name.trim() && onNext({ name: name.trim(), description: desc })}
            disabled={!name.trim()}
            className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            Finish →
          </button>
        </div>
      </div>
    </div>
  );
}

function StepDone({ projectName, onGo }: { projectName: string; onGo: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <span className="text-6xl">🎉</span>
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">You're all set!</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          <strong className="text-slate-700 dark:text-slate-300">{projectName}</strong> has been created with your initial setup.
        </p>
      </div>
      <button
        onClick={onGo}
        className="px-6 py-3 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
      >
        Go to project →
      </button>
    </div>
  );
}

interface Props {
  onClose: () => void;
}

export default function OnboardingWizard({ onClose }: Props) {
  const { createProject, enterProject, createRequirement, createTestPlan, createTestStrategy, createSuite } = useStore();
  const [step, setStep] = useState<WizardStep>('project');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');

  const handleProject = async (name: string, desc: string) => {
    const p = await createProject(name, desc);
    setProjectId(p.id);
    setProjectName(p.name);
    setStep('requirements');
  };

  const handleRequirements = async (reqs: { title: string; description: string }[]) => {
    if (projectId) {
      await Promise.all(reqs.map(r => createRequirement({ ...r, projectId, priority: 'medium', status: 'draft', tags: [], linkedTestIds: [], linkedApiCollectionIds: [] })));
    }
    setStep('plan');
  };

  const handlePlan = async (plan: { name: string; objective: string; scope: string; entryCriteria: string; exitCriteria: string } | null) => {
    if (plan && projectId) {
      await createTestPlan({ ...plan, projectId, resources: '', schedule: '', notes: '', associatedSuiteIds: [] } as any);
    }
    setStep('strategy');
  };

  const handleStrategy = async (strategy: { name: string; approach: string; testLevels: string[]; tools: string } | null) => {
    if (strategy && projectId) {
      await createTestStrategy({ ...strategy, projectId, riskAnalysis: '', notes: '' } as any);
    }
    setStep('suite');
  };

  const handleSuite = async (suite: { name: string; description: string } | null) => {
    if (suite && projectId) {
      await createSuite(suite.name, suite.description, projectId);
    }
    setStep('done');
  };

  const handleFinish = () => {
    if (projectId) enterProject(projectId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">New Project Setup</h1>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >✕</button>
          </div>
          <ProgressBar current={step} />
        </div>

        {/* Step content */}
        <div className="p-6">
          {step === 'project'      && <StepProject      onNext={handleProject}     onSkip={onClose} />}
          {step === 'requirements' && <StepRequirements onNext={handleRequirements} onBack={() => setStep('project')} />}
          {step === 'plan'         && <StepPlan         onNext={handlePlan}         onBack={() => setStep('requirements')} />}
          {step === 'strategy'     && <StepStrategy     onNext={handleStrategy}     onBack={() => setStep('plan')} />}
          {step === 'suite'        && <StepSuite        onNext={handleSuite}        onBack={() => setStep('strategy')} />}
          {step === 'done'         && <StepDone         projectName={projectName}   onGo={handleFinish} />}
        </div>
      </div>
    </div>
  );
}
