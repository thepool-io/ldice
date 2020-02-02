#!/bin/bash
if [ -f "config_dev.json" ]; then
    currentConfig="config_dev.json"
else 
    currentConfig="config.json"
fi
echo -e "Config: "$currentConfig
network=$(jq -r '.components.storage.database' $currentConfig)

help_msg(){
  echo -e "\033[1;31m#####################################\033[0m"
  echo -e "\033[1;31m>>>LDICE - Lisk Dice (LDT) Manager<<<\033[0m"
  echo -e "\033[1;31m#####################################\033[0m"
  echo -e "\033[0;32mMethods\033[0m"
  echo "start - starts ldice node"
  echo "stop - stop ldice node. Ctrl+C to stop. Wait for graceful exit."
  echo "logs - prints current logs"
  echo "dblogs - prints current database logs"
  echo "preparedb - prepares database"
  echo "purgedb - purges & recreates database"
  echo "readnet - reads current network"
  echo "setnet - sets network"
  echo "fullpreqinstall - Installs all dependencies, Ubuntu 18.04 tested."
  echo -e ""
}

start(){
  screen -dmS ldice node index.js
  echo -e "\033[0;32mNode started!\033[0m"
}

stop(){
  screen -x ldice
}

logs(){
  local logFile=$(jq -r '.components.logger.logFileName' $currentConfig)
  if [ -f $logFile ]; then
    tail -f $logFile | npx bunyan -o short
  else 
    echo -e "Log file does not exists at "$logFile
  fi
}

dblogs(){
  local logFile=$(jq -r '.components.storage.logFileName' $currentConfig)
  if [ -f $logFile ]; then
    tail -f $logFile | npx bunyan -o short
  else 
    echo -e "Log file does not exists at "$logFile
  fi
}

preparedb(){
  sudo -u postgres -i createuser --createdb $USER
  sudo -u postgres -i createdb $network --owner $USER
  sudo psql -d $network -c "alter user "$network" with password 'password';"
  sudo -u postgres psql -d $network -c "alter user "$USER" with password 'password';"

  createdb $network --owner $USER
  psql -d $network -c "alter user "$USER" with password 'password';"
}

purgedb(){
  dropdb $network
  createdb $network --owner $USER
  psql -d $network -c "alter user "$USER" with password 'password';"
}

readnet(){
  echo -e $network
}

setnet(){
  [ -z "$1" ] && echo "Invalid network" && exit 1;
  jq '.components.storage.user = "'$USER'"' $currentConfig|sponge $currentConfig
  jq '.components.storage.database = "'$1'"' $currentConfig|sponge $currentConfig
  jq '.components.storage.logFileName = "logs/'$1'/lisk_db.log"' $currentConfig|sponge $currentConfig
  jq '.components.logger.logFileName = "logs/'$1'/lisk.log"' $currentConfig|sponge $currentConfig
}

fullpreqinstall(){
  sudo apt install -y libtool automake autoconf curl python-minimal build-essential moreutils jq screen
  sudo apt-get purge -y postgres* 
  sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  sudo apt install wget ca-certificates
  wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
  sudo apt update
  sudo apt install postgresql-10 -y
  pg_lsclusters
  sudo pg_dropcluster --stop 10 main
  sudo pg_createcluster --locale en_US.UTF-8 --start 10 main
  wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.2/install.sh | bash
  export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm install 10.17.0
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
}

case $1 in
  "readnet")
      readnet
    ;;
  "dblogs")
      dblogs
    ;;
  "logs")
      logs
    ;;
  "start")
      start
    ;;
  "stop")
      stop
    ;;
  "setnet")
      setnet $2
    ;;
  "preparedb")
      preparedb
    ;;
  "purgedb")
      purgedb
    ;;
  "fullpreqinstall")
      fullpreqinstall
    ;;
  *)
    help_msg
    ;;
esac

#EOF