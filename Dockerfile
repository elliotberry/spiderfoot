#
# Spiderfoot Dockerfile (Full - includes all CLI tools, etc.)
#
# http://www.spiderfoot.net
#
# Written by: TheTechromancer
#

FROM python:3.12

# Install tools/dependencies from apt
RUN apt-get -y update && apt-get -y install nbtscan onesixtyone nmap

# Compile other tools from source
RUN mkdir /tools || true
WORKDIR /tools

# Install Golang tools
RUN apt-get -y update && apt-get -y install golang
ENV GOPATH="/go"
ENV PATH="$GOPATH/bin:$PATH"
RUN mkdir -p "$GOPATH/src" "$GOPATH/bin"

# Install Ruby tools for WhatWeb
RUN apt-get -y update && apt-get -y install ruby ruby-dev bundler
# Install WhatWeb
RUN git clone https://github.com/urbanadventurer/WhatWeb \
    && gem install rchardet mongo json && cd /tools/WhatWeb \
    && bundle install && cd /tools

RUN groupadd spiderfoot \
    && useradd -m -g spiderfoot -d /home/spiderfoot -s /sbin/nologin \
    -c "SpiderFoot User" spiderfoot

# Install RetireJS (NodeSource Node 20 + yarn/retire via npm; avoids deprecated apt-key)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g yarn \
    && npm install -g retire

# Install Google Chrome the New Way (Not via apt-key)
# Disabled: google-chrome-stable is amd64-only and fails on arm64 hosts.
#RUN wget -qO - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
#    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | tee /etc/apt/sources.list.d/google-chrome.list \
#    && apt -y update && apt install --allow-unauthenticated -y google-chrome-stable

# Install Wappalyzer CLI via npm (avoids git clone / yarn workspace issues)
RUN npm install -g wappalyzer

# Install Nuclei (arch-aware for amd64/arm64)
RUN set -eux; \
    arch="$(dpkg --print-architecture)"; \
    case "$arch" in \
      amd64) nuclei_arch=amd64 ;; \
      arm64) nuclei_arch=arm64 ;; \
      *) echo "unsupported arch: $arch" >&2; exit 1 ;; \
    esac; \
    wget "https://github.com/projectdiscovery/nuclei/releases/download/v2.6.5/nuclei_2.6.5_linux_${nuclei_arch}.zip"; \
    unzip "nuclei_2.6.5_linux_${nuclei_arch}.zip"; \
    rm "nuclei_2.6.5_linux_${nuclei_arch}.zip"
RUN sh -c 'set -e; \
  for i in 1 2 3; do \
    git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=30 clone --depth 1 https://github.com/projectdiscovery/nuclei-templates.git && exit 0 || { \
      echo "git clone nuclei-templates failed, retry $i..."; \
      sleep $((i*5)); \
    }; \
  done; \
  echo "git clone nuclei-templates failed after retries"; exit 1'

# Install testssl.sh
RUN apt-get install -y bsdmainutils dnsutils coreutils
RUN sh -c 'set -e; \
  for i in 1 2 3; do \
    git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=30 clone --depth 1 https://github.com/drwetter/testssl.sh.git && exit 0 || { \
      echo "git clone testssl.sh failed, retry $i..."; \
      sleep $((i*5)); \
    }; \
  done; \
  echo "git clone testssl.sh failed after retries"; exit 1'

# Install Snallygaster and TruffleHog
RUN pip3 install snallygaster trufflehog

# Place database and logs outside installation directory
ENV SPIDERFOOT_DATA /var/lib/spiderfoot
ENV SPIDERFOOT_LOGS /var/lib/spiderfoot/log
ENV SPIDERFOOT_CACHE /var/lib/spiderfoot/cache

RUN mkdir -p $SPIDERFOOT_DATA || true \
    && mkdir -p $SPIDERFOOT_LOGS || true \
    && mkdir -p $SPIDERFOOT_CACHE || true \
    && chown spiderfoot:spiderfoot $SPIDERFOOT_DATA \
    && chown spiderfoot:spiderfoot $SPIDERFOOT_LOGS \
    && chown spiderfoot:spiderfoot $SPIDERFOOT_CACHE

WORKDIR /home/spiderfoot
COPY . .

ENV VIRTUAL_ENV=/opt/venv
RUN mkdir -p "$VIRTUAL_ENV" || true
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
RUN python -m venv "$VIRTUAL_ENV"

ARG REQUIREMENTS=requirements.txt
COPY "$REQUIREMENTS" requirements.txt

RUN chown -R spiderfoot:spiderfoot /tools
RUN chown -R spiderfoot:spiderfoot "$VIRTUAL_ENV"
RUN chown -R spiderfoot:spiderfoot "/home/spiderfoot"

USER spiderfoot

RUN pip install -U pip
RUN pip install -r "$REQUIREMENTS"

# Install Python tools
RUN pip install dnstwist
# CMSeeK
WORKDIR /tools
RUN git clone https://github.com/Tuhinshubhra/CMSeeK && cd CMSeeK \
    && pip install -r requirements.txt && mkdir Results

# Install wafw00f (packaged via pyproject.toml; setup.py is gone)
RUN pip install wafw00f
WORKDIR /home/spiderfoot

EXPOSE 5001

# Run the application
CMD python -c 'from spiderfoot import SpiderFootDb; \
db = SpiderFootDb({"__database": "/var/lib/spiderfoot/spiderfoot.db"}); \
db.configSet({ \
    "sfp_tool_dnstwist:dnstwistpath": "/opt/venv/bin/dnstwist", \
    "sfp_tool_cmseek:cmseekpath": "/tools/CMSeeK/cmseek.py", \
    "sfp_tool_whatweb:whatweb_path": "/tools/WhatWeb/whatweb", \
    "sfp_tool_wafw00f:wafw00f_path": "/opt/venv/bin/wafw00f", \
    "sfp_tool_onesixtyone:onesixtyone_path": "/usr/bin/onesixtyone", \
    "sfp_tool_retirejs:retirejs_path": "/usr/bin/retire", \
    "sfp_tool_testsslsh:testsslsh_path": "/tools/testssl.sh/testssl.sh", \
    "sfp_tool_snallygaster:snallygaster_path": "/usr/local/bin/snallygaster", \
    "sfp_tool_trufflehog:trufflehog_path": "/usr/local/bin/trufflehog", \
    "sfp_tool_nuclei:nuclei_path": "/tools/nuclei", \
    "sfp_tool_nuclei:template_path": "/tools/nuclei-templates", \
    "sfp_tool_wappalyzer:wappalyzer_path": "/usr/local/bin/wappalyzer", \
    "sfp_tool_nbtscan:nbtscan_path": "/usr/bin/nbtscan", \
    "sfp_tool_nmap:nmappath": "DISABLED_BECAUSE_NMAP_REQUIRES_ROOT_TO_WORK" \
})' || true && python ./sf.py -l 0.0.0.0:5001
