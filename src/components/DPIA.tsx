
"use client";

import * as React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DPIAAnalysis } from "@/lib/types";

interface DPIAProps {
  analysis: DPIAAnalysis;
  onAnalysisChange: (newAnalysis: DPIAAnalysis) => void;
}

export default function DPIA({ analysis, onAnalysisChange }: DPIAProps) {

  const handleFieldChange = (field: keyof DPIAAnalysis, value: string) => {
    onAnalysisChange({ ...analysis, [field]: value });
  };

  const AnalysisField = ({ id, label, description, value }: { id: keyof DPIAAnalysis, label: string, description: string, value: string }) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-semibold">{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => handleFieldChange(id, e.target.value)}
        className="min-h-[120px]"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={['ros-analysis']} className="w-full">
        <AccordionItem value="ros-analysis">
          <AccordionTrigger>Steg 1: ROS-analyse – Hva kan gå galt?</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <AnalysisField
              id="scope"
              label="Definer omfanget"
              description="Hvilke deler av appen og tilhørende systemer skal analyseres?"
              value={analysis.scope}
            />
            <AnalysisField
              id="values"
              label="Identifiser verdier"
              description="Hva er de viktigste verdiene i appen din? (f.eks. brukerdata, omdømme, tjenesten)"
              value={analysis.values}
            />
            <AnalysisField
              id="unwantedEvents"
              label="Kartlegg uønskede hendelser"
              description="Hva kan gå galt? (Tekniske feil, menneskelige feil, ondsinnede handlinger, datatap etc.)"
              value={analysis.unwantedEvents}
            />
            <AnalysisField
              id="probabilityAndConsequence"
              label="Vurder sannsynlighet og konsekvens"
              description="For hver uønskede hendelse, vurder hvor sannsynlig den er og hva konsekvensene vil være (lav, middels, høy)."
              value={analysis.probabilityAndConsequence}
            />
            <AnalysisField
              id="measures"
              label="Planlegg tiltak"
              description="Lag en plan for tiltak som kan redusere sannsynlighet eller begrense skade."
              value={analysis.measures}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="dpia">
          <AccordionTrigger>Steg 2: DPIA – Hvordan beskytter du brukernes personvern?</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
             <AnalysisField
              id="dataProcessingDescription"
              label="Beskrivelse av behandlingen"
              description="Hvilke data samles inn, hvorfor, hvordan, og hvem har tilgang?"
              value={analysis.dataProcessingDescription}
            />
             <AnalysisField
              id="necessityAndProportionality"
              label="Vurdering av nødvendighet og forholdsmessighet"
              description="Er det nødvendig å samle inn all dataen? Er inngrepet proporsjonalt med fordelen?"
              value={analysis.necessityAndProportionality}
            />
             <AnalysisField
              id="riskAssessment"
              label="Vurdering av risiko for de registrertes rettigheter og friheter"
              description="Hva er risikoen for datalekkasje, uautorisert tilgang etc. og hva er de potensielle konsekvensene?"
              value={analysis.riskAssessment}
            />
            <AnalysisField
              id="riskMeasures"
              label="Planlagte tiltak for å håndtere risikoene"
              description="Beskriv tekniske, organisatoriske og juridiske tiltak."
              value={analysis.riskMeasures}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
