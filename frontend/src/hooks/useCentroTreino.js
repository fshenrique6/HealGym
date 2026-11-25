import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { idDaSessaoAberta, mensagemDeErro } from '../utils/rotina';

/** Carrega a rotina ativa e o histórico. Leituras não gravam nada. */
export default function useCentroTreino() {
  const [carregando, setCarregando] = useState(true);
  const [rotina, setRotina] = useState(null);
  const [estado, setEstado] = useState(null);
  const [perfilResumo, setPerfilResumo] = useState(null);
  const [desatualizada, setDesatualizada] = useState(false);
  const [mudancasPerfil, setMudancasPerfil] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [erro, setErro] = useState('');
  const [iniciando, setIniciando] = useState(false);
  const [reavaliacao, setReavaliacao] = useState('');
  const ativoRef = useRef(true);

  const aplicarConsulta = useCallback((dados) => {
    setRotina(dados?.rotina || null);
    setEstado(dados?.estado || null);
    setPerfilResumo(dados?.perfil || dados?.rotina?.perfil || null);
    setDesatualizada(Boolean(dados?.desatualizada));
    setMudancasPerfil(Array.isArray(dados?.mudancasPerfil) ? dados.mudancasPerfil : []);
    setReavaliacao(typeof dados?.reavaliacao === 'string' ? dados.reavaliacao : '');
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const [rotinaRes, histRes] = await Promise.all([api.getRotina(), api.getMyWorkouts()]);
      if (!ativoRef.current) return;
      if (rotinaRes?.success) aplicarConsulta(rotinaRes.data);
      setHistorico(Array.isArray(histRes?.data) ? histRes.data : []);
    } catch (error) {
      if (ativoRef.current) {
        setErro(mensagemDeErro(error, 'Não foi possível carregar seus treinos.'));
      }
    } finally {
      if (ativoRef.current) setCarregando(false);
    }
  }, [aplicarConsulta]);

  useEffect(() => {
    ativoRef.current = true;
    carregar();
    return () => {
      ativoRef.current = false;
    };
  }, [carregar]);

  const aoSalvarRotina = useCallback((dados) => {
    if (dados?.rotina) {
      setRotina(dados.rotina);
      setEstado(null);
      setDesatualizada(false);
      setMudancasPerfil([]);
      setReavaliacao('');
    }
    return carregar();
  }, [carregar]);

  const iniciarSessao = useCallback(async (codigo) => {
    if (iniciando) return null;
    setIniciando(true);
    setErro('');
    try {
      const resposta = await api.iniciarSessaoRotina(codigo);
      const treino = resposta?.data?.treino || resposta?.data;
      const id = treino?._id || treino?.id;
      await carregar();
      return {
        id,
        criado: Boolean(resposta?.data?.criado),
        treino,
        avisoRecuperacao:
          typeof resposta?.data?.avisoRecuperacao === 'string' ? resposta.data.avisoRecuperacao : '',
      };
    } catch (error) {
      if (!error?.response) {
        try {
          const consulta = await api.getRotina();
          const aberto = idDaSessaoAberta(consulta?.data?.estado, codigo);
          if (consulta?.success && aberto) {
            if (ativoRef.current) aplicarConsulta(consulta.data);
            return { id: aberto, criado: false, treino: null, avisoRecuperacao: '' };
          }
        } catch {
          // A consulta também ficou sem resposta.
        }
      }
      setErro(mensagemDeErro(error, 'Não foi possível iniciar o treino.'));
      throw error;
    } finally {
      setIniciando(false);
    }
  }, [aplicarConsulta, carregar, iniciando]);

  return {
    carregando,
    rotina,
    estado,
    perfilResumo,
    desatualizada,
    mudancasPerfil,
    historico,
    erro,
    setErro,
    iniciando,
    reavaliacao,
    carregar,
    aoSalvarRotina,
    iniciarSessao,
  };
}
