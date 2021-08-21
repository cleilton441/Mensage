const net = require('net')

const servidor = net.createServer()
const porta = 8888

var arrayMensagens = []  

var arrayMapeamentoTopicoPorta = []

const pacoteManterConexao = {
    topico: "KeepConnection",
    confirmacao: false,
    primeiraComunicacao: true,
    mensagemProdutor: false,
}

function main() {
    console.log("[+] Iniciando servidor")
    inicializarServidor()
}

function inicializarServidor(){
    servidor.listen(8888, function(){
        console.log(`[+] Escutando na porta: ${porta}`)
    })

    servidor.on('connection', (socketServidor) => {
        console.log(`[+] Nova conexão na porta: ${socketServidor.remotePort}`)
        
        //Fluxo principal:
        socketServidor.on('data', (fluxoDados) => {
            let pacote

            fluxoDados = fluxoDados.toString() //Conversão de bytes para string.
            
            //Primeira comunicação do consumidor com o servidor (Só acontece uma vez)
            if(fluxoDados.includes('"primeiraComunicacao": true')){

                fluxoDados = fluxoDados.split('\r\n')
                        
                for(let i = 0; i < fluxoDados.length-1; i++ ){
                    pacote = JSON.parse(fluxoDados[i]) // Transformação de string para objeto.
                    trataConsumidor(pacote, socketServidor) // Tratar cada objeto isoladamente.
                }

                socketServidor.write(Buffer.from(JSON.stringify(pacoteManterConexao)))
                return 
            }

            //Processamento rotineiro do servidor.
            pacote = (JSON.parse(fluxoDados))

            if(pacote.confirmacao == true){
                trataPacoteConfirmacao(pacote, socketServidor)
                return
            } 

            if(pacote.tipo == "Produtor"){
                trataProdutor(pacote, socketServidor)
                return
            } 
            
            if(pacote.tipo == "Consumidor") {
                trataConsumidor(pacote, socketServidor)
                return
            } 
        })
    
        socketServidor.on('close', () => {
            removerClienteMapeamento(socketServidor)

            console.log('[+] Cliente desconectado')
        })

        socketServidor.on('error', () => {

        })
    })
}

function removerClienteMapeamento(socketServidor){
    /*
        removerClienteMapeamento(Socket) => void

        A função se encarrega de excluir o cliente do array de mapeamento quando ele é desconectado.
    */ 

    for(let i = 0; i < arrayMapeamentoTopicoPorta.length; i++){
        for(let j = 0; j < arrayMapeamentoTopicoPorta[i].conexoes.length; j++){
            if(String(arrayMapeamentoTopicoPorta[i].conexoes[j].port) == String(socketServidor.remotePort)){
                arrayMapeamentoTopicoPorta[i].conexoes.splice(j, 1)    
            }
        }
    }
    return
}

function trataProdutor(pacote, socketServidor) {

    /*
        trataProdutor(Objeto, Socket) => void

        Função que se encarrega de tratar pacotes do tipo produtor. Basicamente, é feito o armazenamento
        do pacote no array global arrayMensagens.
    */

    if(arrayMensagens.length == 0){
        const fila = new Array(pacote)
        arrayMensagens.push(fila)
        socketServidor.write(Buffer.from("NextQuestion"))

        return
    }

    for(let i = 0; i < arrayMensagens.length; i++){
        if(arrayMensagens[i][0].topico == pacote.topico){
            arrayMensagens[i][arrayMensagens[i].length] = pacote
            socketServidor.write(Buffer.from("NextQuestion"))

            return
        }
    }

    const fila = new Array(pacote)
    arrayMensagens.push(fila)
    socketServidor.write(Buffer.from("NextQuestion"))

    return
}

function trataConsumidor(pacote, socketServidor) {
    /*
        trataConsumidor(Objeto, Socket) => void

        A função se encarrega de tratar pacotes originados do consumidor. Basicamente, a função precisa checar se
        o consumidor do pacote está mapeado no array global arrayMapeamentoTopicoPorta e verificar se
        o tópico pedido no pacote possui mensagens disponíveis no array global arrayMensagens.
    */

    /*Checagem do mapeamento*/

    /*Situação inicial, onde não existe registros de mapeamento dos consumidores conectados*/
    let mapeamentoConexao
    if(arrayMapeamentoTopicoPorta.length == 0){
        mapeamentoConexao = {
            topico: pacote.topico,
            conexoes: [
                {
                    port: socketServidor.remotePort,
                    confirmacao: pacote.confirmacao,
                }
            ],
        }

        arrayMapeamentoTopicoPorta.push(mapeamentoConexao)
    }else{
        /*Caso exista conteúdo, devo procurar pelo tópico que o consumidor está pedindo mensagem*/
        let existeTopicoNoArray = false
        let index = 0;
            
        for(let i = 0; i < arrayMapeamentoTopicoPorta.length; i++){
            if(arrayMapeamentoTopicoPorta[i].topico == pacote.topico){
                existeTopicoNoArray = true
                index = i;
                break;
            }
        }

        if(existeTopicoNoArray){
    
            /*Caso exista o tópico procurado, o servidor irá checar se o consumidor já está registrado.*/
            let arrayConexoesChecado = true;

            for(let j = 0; j < arrayMapeamentoTopicoPorta[index].conexoes.length; j++){
                if(String(arrayMapeamentoTopicoPorta[index].conexoes[j].port) == String(socketServidor.remotePort)){
                    arrayConexoesChecado = false
                    break
                }
            }

            if(arrayConexoesChecado){
                /*Caso em que o consumidor não está registrado*/
                const mapeamentoConexao = {
                    port: socketServidor.remotePort,
                    confirmacao: pacote.confirmacao
                }

                arrayMapeamentoTopicoPorta[index].conexoes.push(mapeamentoConexao)
            }                            
        }else{

            /*Caso em que não existe o tópico procurado pelo consumidor*/            
            
            const mapeamentoConexao = {
                topico: pacote.topico,
                conexoes: [
                    {
                        port: socketServidor.remotePort,
                        confirmacao: pacote.confirmacao,
                    }
                ],
            }

            arrayMapeamentoTopicoPorta.push(mapeamentoConexao)
        }
    }
    /*Fim checagem do mapeamento*/

    /* Verificando mensagens disponíveis*/ 

    //Situação inicial, onde possivelmente o arrayMensagens não possui nenhum tópíco.
    if(arrayMensagens.length == 0){
        if(!pacote.primeiraComunicacao) socketServidor.write(Buffer.from(JSON.stringify(pacote)))
        return
    }

    //Situação onde pode existir o tópico pedido pelo consumidor e procuro por ele no arrayMensagens
    //Caso ache, a função irá enviar todas as mensagens disponíveis. 
    const topico = pacote.topico
    for(let i = 0; i < arrayMensagens.length; i++){
        if(arrayMensagens[i][0].topico == topico){
            if(pacote.primeiraComunicacao) return
            let mensagem
            let mensagens = ''
            for(let j = 0; j < arrayMensagens[i].length; j++){
                mensagem = arrayMensagens[i][j]
                mensagens += `${JSON.stringify(mensagem)}\r\n`
            } 

            socketServidor.write(Buffer.from(mensagens))
            
            return
        }
    }

    //Situação onde foi verificado no arrayMensagens que não existe o tópico pedido
    if(!pacote.primeiraComunicacao) socketServidor.write(Buffer.from(JSON.stringify(pacote)))
    return
}

function trataPacoteConfirmacao(pacote, socketServidor){

    /*
        trataPacoteConfirmacao(Objeto, Socket) => void

        A função se encarrega de tratar pacotes do consumidor com a propriedade confirmacao setada como true.
        O servidor precisa saber se todos os consumidores, que estão escutando um determinado tópico, receberam
        as mensagens. Se todos os consumidores receberam as mensagens, portanto o servidor irá excluir a fila de
        mensagens daquele tópico no array global arrayMensagens.
    */

    for(let u = 0; u < arrayMapeamentoTopicoPorta.length; u++){

        /*Procuro pelo tópico que o consumidor mandou a confirmação*/
        if(arrayMapeamentoTopicoPorta[u].topico == pacote.topico){

            /*Procuro pelo registro desse consumidor no array de conexões vinculado ao tópico achado.*/
            for(let i = 0; i < arrayMapeamentoTopicoPorta[u].conexoes.length; i++){
                /* Verifico o registro do consumidor e coloco a sua propriedade de confirmacao como true*/
                if(String(arrayMapeamentoTopicoPorta[u].conexoes[i].port) == String(socketServidor.remotePort)){
                    arrayMapeamentoTopicoPorta[u].conexoes[i].confirmacao = true
                    break;
                }
            }

            /*Checa se todos os consumidores receberam as mensagens*/
            const confirmacoesEsperadas = arrayMapeamentoTopicoPorta[u].conexoes.length;
            let confirmacoesChecadas = 0;

            for(let i = 0; i < arrayMapeamentoTopicoPorta[u].conexoes.length; i++){
                if(arrayMapeamentoTopicoPorta[u].conexoes[i].confirmacao == true){
                    confirmacoesChecadas++;
                }
            }

            if(confirmacoesEsperadas == confirmacoesChecadas){

                for(let y = 0;y < arrayMensagens.length; y++){
                    if(arrayMensagens[y][0].topico == pacote.topico){
                        arrayMensagens.splice(y, 1)

                        socketServidor.write(Buffer.from(JSON.stringify(pacoteManterConexao)))
                        break;
                    }
                }

                for(let u = 0; u < arrayMapeamentoTopicoPorta.length; u++){
                    if(arrayMapeamentoTopicoPorta[u].topico == pacote.topico){
                        for(let i = 0; i < arrayMapeamentoTopicoPorta[u].conexoes.length; i++){
                            arrayMapeamentoTopicoPorta[u].conexoes[i].confirmacao = false;
                        }
                        return
                    }
                }
            }

            socketServidor.write(Buffer.from(JSON.stringify(pacoteManterConexao)))
            return

        }
    }
    return
}

main()