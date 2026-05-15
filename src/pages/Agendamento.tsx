import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Calendar as CalendarIcon, CheckCircle2, Loader2, Building2, Stethoscope, User } from "lucide-react";
import logoDmi from "@/assets/logodmi-nova.jpg";
import MaskedInput from "@/components/registration/MaskedInput";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function Agendamento() {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const [unidade, setUnidade] = useState(""); // 'hsf' ou 'rededmi'
    const [especialidade, setEspecialidade] = useState("");
    const [profissional, setProfissional] = useState("");
    const [dataSelecionada, setDataSelecionada] = useState("");
    const [horaSelecionada, setHoraSelecionada] = useState("");

    const [paciente, setPaciente] = useState({
        nome: "",
        cpf: "",
        data_nascimento: "",
        telefone: "",
        sexo: ""
    });

    // Mocks estruturados com base nos dados reais da Clínica DMI e Hospital DMI
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
    const profissionaisMock = especialidade && agendasAtuais[especialidade] ? agendasAtuais[especialidade] : [];
    const datasMock = ["2026-05-20", "2026-05-21", "2026-05-22"];
    const horasMock = ["08:00", "09:30", "14:00", "15:30"];

    useEffect(() => {
        if (step === 2 && unidade) {
            buscarAgendas();
        }
    }, [step, unidade]);

    const buscarAgendas = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("agendamento-lavite", {
                body: { action: "listar_agendas", payload: { unidade } }
            });

            if (error) throw error;
            console.log(`Agendas da unidade ${unidade}:`, data);
            // TODO: Aqui mapearemos os dados reais quando identificarmos a estrutura do JSON da Lavite
        } catch (error) {
            console.error("Erro ao buscar agendas:", error);
            toast.error("Exibindo horários de demonstração por enquanto.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAgendar = async () => {
        if (!paciente.nome || !paciente.cpf || !paciente.telefone) {
            toast.error("Preencha os dados obrigatórios do paciente.");
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("agendamento-lavite", {
                body: {
                    action: "criar_agendamento",
                    payload: {
                        unidade,
                        paciente: paciente,
                        agendamento: {
                            especialidade: especialidade,
                            profissional: profissional,
                            data: dataSelecionada,
                            hora: horaSelecionada,
                            agenda_id: 1 // TODO: pegar o ID real da agenda escolhida
                        }
                    }
                }
            });

            if (error) throw error;
            toast.success("Agendamento realizado com sucesso!");
            setStep(4);
        } catch (error: any) {
            console.error("Erro ao agendar:", error);
            toast.error("Erro ao confirmar agendamento", {
                description: error.message || "Verifique os dados e tente novamente."
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans">
            <header className="bg-white border-b border-gray-200 py-4 px-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <img src={logoDmi} alt="DMI" className="h-8 object-contain" />
                    <div className="w-6" />
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center py-10 px-4 sm:px-6">
                <div className="w-full max-w-xl space-y-6">
                    <div className="text-center space-y-2 mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Agendar Consulta</h1>
                        <p className="text-gray-500">Siga os passos abaixo para marcar seu atendimento.</p>
                    </div>

                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                        {step === 1 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div className="flex items-center gap-3 border-b pb-4">
                                    <Building2 className="w-6 h-6 text-[#0EA5FF]" />
                                    <h2 className="text-xl font-semibold">1. Escolha a Unidade</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div
                                        onClick={() => setUnidade('rededmi')}
                                        className={`cursor-pointer border-2 rounded-xl p-6 text-center transition-all ${unidade === 'rededmi' ? 'border-[#0EA5FF] bg-[#0EA5FF]/5' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <h3 className="font-bold text-lg text-gray-900 mb-1">Clínica DMI</h3>
                                        <p className="text-sm text-gray-500">Atendimentos e exames rápidos</p>
                                    </div>
                                    <div
                                        onClick={() => setUnidade('hsf')}
                                        className={`cursor-pointer border-2 rounded-xl p-6 text-center transition-all ${unidade === 'hsf' ? 'border-[#0EA5FF] bg-[#0EA5FF]/5' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <h3 className="font-bold text-lg text-gray-900 mb-1">Hospital DMI</h3>
                                        <p className="text-sm text-gray-500">(Antigo Santa Fé)</p>
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <Button className="w-full h-12 text-lg" disabled={!unidade} onClick={() => setStep(2)}>Continuar</Button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div className="flex items-center gap-3 border-b pb-4">
                                    <Stethoscope className="w-6 h-6 text-[#0EA5FF]" />
                                    <h2 className="text-xl font-semibold">2. Especialidade e Horário</h2>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Especialidade</Label>
                                            <Select value={especialidade} onValueChange={(v) => { setEspecialidade(v); setProfissional(""); setDataSelecionada(""); setHoraSelecionada(""); }}>
                                                <SelectTrigger className="h-12"><SelectValue placeholder="Escolha a especialidade" /></SelectTrigger>
                                                <SelectContent>
                                                    {especialidadesMock.map(esp => <SelectItem key={esp} value={esp}>{esp}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Profissional</Label>
                                            <Select value={profissional} onValueChange={setProfissional} disabled={!especialidade}>
                                                <SelectTrigger className="h-12"><SelectValue placeholder="Escolha o médico" /></SelectTrigger>
                                                <SelectContent>
                                                    {profissionaisMock.map(prof => <SelectItem key={prof} value={prof}>{prof}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Data</Label>
                                            <Select value={dataSelecionada} onValueChange={setDataSelecionada} disabled={!profissional}>
                                                <SelectTrigger className="h-12"><SelectValue placeholder="Selecione o dia" /></SelectTrigger>
                                                <SelectContent>
                                                    {datasMock.map(data => <SelectItem key={data} value={data}>{new Date(data).toLocaleDateString('pt-BR')}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Horário</Label>
                                            <Select value={horaSelecionada} onValueChange={setHoraSelecionada} disabled={!dataSelecionada}>
                                                <SelectTrigger className="h-12"><SelectValue placeholder="Selecione a hora" /></SelectTrigger>
                                                <SelectContent>
                                                    {horasMock.map(hora => <SelectItem key={hora} value={hora}>{hora}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button variant="outline" className="w-full h-12" onClick={() => setStep(1)}>Voltar</Button>
                                    <Button className="w-full h-12" disabled={!horaSelecionada} onClick={() => setStep(3)}>Continuar</Button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div className="flex items-center gap-3 border-b pb-4">
                                    <User className="w-6 h-6 text-[#0EA5FF]" />
                                    <h2 className="text-xl font-semibold">3. Dados do Paciente</h2>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Nome Completo do Paciente *</Label>
                                        <Input className="h-12" placeholder="Ex: João da Silva" value={paciente.nome} onChange={e => setPaciente({ ...paciente, nome: e.target.value })} />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>CPF *</Label>
                                            <MaskedInput mask="000.000.000-00" placeholder="000.000.000-00" className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={paciente.cpf} onAccept={(v) => setPaciente({ ...paciente, cpf: v })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Telefone / WhatsApp *</Label>
                                            <MaskedInput mask="(00) 00000-0000" placeholder="(00) 00000-0000" className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={paciente.telefone} onAccept={(v) => setPaciente({ ...paciente, telefone: v })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Data de Nascimento</Label>
                                            <MaskedInput mask="00/00/0000" placeholder="DD/MM/AAAA" className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={paciente.data_nascimento} onAccept={(v) => setPaciente({ ...paciente, data_nascimento: v })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Sexo</Label>
                                            <Select value={paciente.sexo} onValueChange={(v) => setPaciente({ ...paciente, sexo: v })}>
                                                <SelectTrigger className="h-12"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="M">Masculino</SelectItem>
                                                    <SelectItem value="F">Feminino</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button variant="outline" className="w-full h-12" onClick={() => setStep(2)}>Voltar</Button>
                                    <Button className="w-full h-12 bg-green-600 hover:bg-green-700" onClick={handleAgendar} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                                        Confirmar Agendamento
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="text-center space-y-6 py-8 animate-in zoom-in-95">
                                <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">Consulta Confirmada!</h3>
                                <div className="bg-gray-50 rounded-xl p-6 text-left inline-block max-w-sm w-full mx-auto space-y-3">
                                    <p className="text-sm"><span className="text-gray-500 block">Paciente</span> <span className="font-semibold text-lg">{paciente.nome}</span></p>
                                    <p className="text-sm"><span className="text-gray-500 block">Unidade</span> <span className="font-semibold">{unidade === 'hsf' ? 'Hospital DMI' : 'Clínica DMI'}</span></p>
                                    <p className="text-sm"><span className="text-gray-500 block">Especialidade</span> <span className="font-semibold">{especialidade}</span></p>
                                    <p className="text-sm"><span className="text-gray-500 block">Profissional</span> <span className="font-semibold">{profissional}</span></p>
                                    <p className="text-sm"><span className="text-gray-500 block">Data e Hora</span> <span className="font-semibold">{new Date(dataSelecionada).toLocaleDateString('pt-BR')} às {horaSelecionada}</span></p>
                                </div>
                                <p className="text-gray-500 text-sm max-w-md mx-auto">
                                    Você receberá as orientações detalhadas e o lembrete da consulta no seu WhatsApp.
                                </p>
                                <div className="pt-4">
                                    <Link to="/">
                                        <Button variant="outline" className="h-12 px-8">Voltar ao Início</Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}