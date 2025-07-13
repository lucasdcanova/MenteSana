import { Link } from 'wouter';
import { User } from '@shared/schema';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  FileText, 
  BarChart,
  Phone,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PatientTableProps {
  patients: User[];
  isLoading: boolean;
}

export function PatientTable({ patients, isLoading }: PatientTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (!patients || patients.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-white">
        <p className="text-emerald-700 mb-4">Nenhum paciente encontrado</p>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          Adicionar Novo Paciente
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Paciente</TableHead>
            <TableHead>Data de Cadastro</TableHead>
            <TableHead>Próxima Sessão</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                    {patient.firstName[0]}{patient.lastName[0]}
                  </div>
                  <div>
                    <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                    <div className="text-xs text-gray-500">{patient.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {format(new Date(patient.createdAt), 'PP', { locale: ptBR })}
              </TableCell>
              <TableCell>
                <div className="flex items-center text-emerald-600">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Não agendada</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/patient-progress/${patient.id}`}>
                      <BarChart className="h-4 w-4 mr-1" />
                      Progresso
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/patient-notes/${patient.id}`}>
                      <FileText className="h-4 w-4 mr-1" />
                      Notas
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/video-call/${patient.id}`}>
                      <Phone className="h-4 w-4 mr-1" />
                      Chamar
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}