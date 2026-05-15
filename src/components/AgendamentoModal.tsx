import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, X, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";

interface AgendamentoModalProps {
    isOpen: boolean;
    onClose: () => void;
    pacienteCpf: string;
    pacienteNome: string;
}

export default function AgendamentoModal({ isOpen, onClose, pacienteCpf, pacienteNome }: AgendamentoModalProps) {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const [unidade, setUnidade] = useState(""); // Adicionado controle de unidade

    const agendasMockREDEDMI: Record<string, string[]> = {
        "Cardiologia": ["Dr. Lamberto de Oliveira Sales Neto", "Dra. Ataline Barbosa de Lima"],
        "Cirurgia Vascular": ["Dr. Diego Tavares Rufino Alves"],
        "Coloproctologia": ["Dra. Samara Duarte Oliveira"],
        "Dermatologia": ["Dr. Sebastião Ferreira Leite Júnior"],
        "Eletroencefalografia": ["Dra. Maria Rozivera Araujo Rodrigues"],
        "Endocrinologia": ["Dr. Antonioni de Assis Clemente da Silva", "Dra. Iranilda Gomes da Silva", "Dr. Jeronimo Tenorio de Brito Junior", "Dr. Caique Ainã Bispo de Araujo"],
        "Fonoaudiologia": ["Dra. Martha Lúcia Melo do Rego Barros"],
        "Ginecologia e Obstetrícia": ["Dr. Valdemilson Alves", "Dra. Dania Morris Perdomo"],
        "Médico do Trabalho": ["Dr. Adalmyr de Souza Holanda"],
        "Neurologia": ["Dr. Aldrin Henrique Silva Barros", "Dr. Marcio Alexandre Lima do Nascimento"],
        "Nutrição": ["Everton da Silva Ferreira", "Fernanda Leite Soares", "Inacia Alaise dos Santos", "Maria Emily Rodrigues", "Socrates Manso Vilela Marinho Junior"],
        "Ortopedia e Traumatologia": ["Dr. Alfredo Lourenço", "Dr. Leonardo Araujo Lins"],
        "Otorrinolaringologia": ["Dr. João Victor Holanda Camurça", "Dr. Renan Santos Aquino Calheiros"],
        "Pediatria": ["Dra. Denise Maria Cesar de Araujo", "Dra. Isadora Arielle de Souza Holanda"],
        "Psiquiatria": ["Dra. Maria Daniela Figueiredo de Lucena"],
        "Reumatologia": ["Dra. Thais Rose Silva Ferreira"],
        "Ultrassonografia": ["Dr. Abrahao Amorim de Oliveira e Silva", "Dra. Givania Leite Santos", "Dr. Jadnilson José Queiroz da Silva", "Dr. Rafael Lacerda da Silva"]
    };

    const agendasMockHSF: Record<string, string[]> = {
        "Cardiologia": ["Dr. Pedro Marinho Sobrinho"],
        "Clínico Geral": ["Dr. Tito Jose de Barros Correia"],
        "Dermatologia": ["Dra. Maria Eugenia Santana Rocha"],
        "Endocrinologia": ["Dr. Caique Ainã Bispo de Araujo"],
        "Gastrologia / Endoscopia": ["Dr. Paulo Guilherme Accioly Pires Galvao"],
        "Ginecologia e Obstetrícia": ["Dra. Olivia Maria Muniz de Andrade e Silva", "Dr. Paulo Andre Saraiva"],
        "Mamografia": ["Pryscila Brito de Macena"],
        "Nutrição": ["Jessica Raquel Batista da Silva Araújo", "Kaio Henrique Alves de Albuquerque", "Newton Gabriel Torres Tirelli Gomes dos Santos"],
        "Ortopedia e Traumatologia": ["Dr. Alexandre Braga Guimaraes"],
        "Pediatria": ["Dr. Manoel Eduardo da Rocha"],
        "Ultrassonografia": ["Dr. Tales Amorim Araujo Reis"],
        "Urologia": ["Dr. Jose Ronaldo da Silva", "Dr. Rodrigo Sant'Anna de Melo Lins"]
    };

    const agendasAtuais = unidade === 'hsf' ? agendasMockHSF : (unidade === 'rededmi' ? agendasMockREDEDMI : {});
    const especialidadesMock = Object.keys(agendasAtuais).sort();
    const datasMock = ["2026-05-20", "2026-05-21", "2026-05-22"];
    const horasMock = ["08:00", "09:30", "14:00", "15:30"];

    const [agendasReais, setAgendasReais] = useState<any[]>([]);
    const [especialidade, setEspecialidade] = useState("");
    const profissionaisMock = especialidade && agendasAtuais[especialidade] ? agendasAtuais[especialidade] : [];
    const [profissional, setProfissional] = useState("");
    const [dataSelecionada, setDataSelecionada] = useState("");
    const [horaSelecionada, setHoraSelecionada] = useState("");

    // Efeito para carregar agendas quando abrir o modal
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setUnidade("");
            setEspecialidade("");
            setProfissional("");
            setDataSelecionada("");
            setHoraSelecionada("");
            setAgendasReais([]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (unidade) {
            buscarAgendas();
        }
    }, [unidade]);

    const buscarAgendas = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("agendamento-lavite", {
                body: { action: "listar_agendas", payload: { unidade } }
            });

            if (error) throw error;

            console.log("Agendas recebidas da Lavite:", data);
            if (data) {
                // Guardamos as agendas reais para usar no mapeamento dos selects assim que soubermos o formato
                setAgendasReais(Array.isArray(data) ? data : (data.agendas || data.data || []));
            }
        } catch (error) {
            console.error("Erro ao buscar agendas:", error);
            toast.error("Não foi possível carregar a lista de horários. Tentando modo de demonstração.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAgendar = async () => {
        if (!unidade || !especialidade || !profissional || !dataSelecionada || !horaSelecionada) {
            toast.error("Por favor, preencha todos os campos.");
            return;
        }

        setIsLoading(true);
        try {
            // Tenta adivinhar o ID da agenda se tivermos dados reais, senão usa mock
            let agendaIdToUse = 1;
            let horarioIdToUse = undefined;

            // Chama a nossa rota POST que valida o paciente e marca a consulta
            const { data, error } = await supabase.functions.invoke("agendamento-lavite", {
                body: {
                    action: "criar_agendamento",
                    payload: {
                        unidade,
                        paciente: {
                            nome: pacienteNome,
                            cpf: pacienteCpf,
                        },
                        agendamento: {
                            especialidade: especialidade,
                            profissional: profissional,
                            data: dataSelecionada,
                            hora: horaSelecionada,
                            agenda_id: agendaIdToUse,
                            horario_id: horarioIdToUse
                        }
                    }
                }
            });

            if (error) {
                // Extrai erros envelopados pela biblioteca supabase-js
                const message = error.context?.error || error.message;
                throw new Error(message || "Erro de comunicação com o servidor.");
            }

            if (data && data.error) {
                throw new Error(data.error);
            }

            toast.success("Agendamento realizado com sucesso!");
            setStep(3); // Vai para a tela de Sucesso
        } catch (error: any) {
            console.error("Erro ao confirmar agendamento:", error);

            // Extrai a mensagem limpa
            const errorMessage = error?.message || "Tente novamente mais tarde.";

            toast.error("Erro ao agendar consulta", {
                description: errorMessage
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden relative">
                {/* Header */}
                <div className="bg-primary p-4 text-primary-foreground flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5" />
                        <h2 className="font-semibold text-lg">Nova Consulta</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {step === 1 && (
                        <div className="space-y-4 animate-in slide-in-from-right-4">
                            <p className="text-sm text-muted-foreground mb-4">
                                Selecione a unidade, especialidade e profissional desejado para o paciente <strong>{pacienteNome}</strong>.
                            </p>

                            <div className="space-y-2">
                                <Label>Unidade</Label>
                                <Select value={unidade} onValueChange={(v) => { setUnidade(v); setEspecialidade(""); setProfissional(""); setDataSelecionada(""); setHoraSelecionada(""); }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Escolha a clínica ou hospital" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="rededmi">Clínica DMI</SelectItem>
                                        <SelectItem value="hsf">Hospital DMI (Antigo Santa Fé)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Especialidade</Label>
                                <Select value={especialidade} onValueChange={(v) => { setEspecialidade(v); setProfissional(""); setDataSelecionada(""); setHoraSelecionada(""); }} disabled={!unidade}>
                                    <SelectTrigger disabled={!unidade}>
                                        <SelectValue placeholder="Escolha a especialidade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {especialidadesMock.map(esp => (
                                            <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 mt-4">
                                <Label>Profissional</Label>
                                <Select value={profissional} onValueChange={setProfissional} disabled={!especialidade}>
                                    <SelectTrigger disabled={!especialidade}>
                                        <SelectValue placeholder="Escolha o médico" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {profissionaisMock.map(prof => (
                                            <SelectItem key={prof} value={prof}>{prof}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                className="w-full mt-4"
                                disabled={!profissional}
                                onClick={() => setStep(2)}
                            >
                                Continuar
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in slide-in-from-right-4">
                            <p className="text-sm text-muted-foreground mb-4">
                                Escolha a data e o horário disponíveis com <strong>{profissional}</strong>.
                            </p>

                            <div className="space-y-2">
                                <Label>Data Disponível</Label>
                                <Select value={dataSelecionada} onValueChange={setDataSelecionada}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o dia" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {datasMock.map(data => (
                                            <SelectItem key={data} value={data}>
                                                {new Date(data).toLocaleDateString('pt-BR')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Horário</Label>
                                <Select value={horaSelecionada} onValueChange={setHoraSelecionada}>
                                    <SelectTrigger disabled={!dataSelecionada}>
                                        <SelectValue placeholder="Selecione a hora" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {horasMock.map(hora => (
                                            <SelectItem key={hora} value={hora}>{hora}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" className="w-full" onClick={() => setStep(1)} disabled={isLoading}>
                                    Voltar
                                </Button>
                                <Button className="w-full" onClick={handleAgendar} disabled={!horaSelecionada || isLoading}>
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Confirmar
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center space-y-4 py-6 animate-in zoom-in-95">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Agendado com sucesso!</h3>
                            <p className="text-muted-foreground text-sm">
                                <strong>Unidade:</strong> {unidade === 'hsf' ? 'Hospital DMI' : 'Clínica DMI'}<br />
                            </p>
                            <p className="text-muted-foreground text-sm">
                                Sua consulta para <strong>{especialidade}</strong> com <strong>{profissional}</strong> no dia{" "}
                                <strong>{new Date(dataSelecionada).toLocaleDateString('pt-BR')}</strong> às{" "}
                                <strong>{horaSelecionada}</strong> foi confirmada.
                            </p>
                            <p className="text-muted-foreground text-sm font-medium">
                                Você receberá os detalhes no seu WhatsApp em instantes!
                            </p>
                            <div className="pt-6">
                                <Button className="w-full" onClick={onClose}>
                                    Fechar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}