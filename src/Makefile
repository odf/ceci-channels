BUILD=../lib/src

.SUFFIXES:	.js .jso

.js.jso:
		../node_modules/.bin/regenerator $^ >$@

all:		channels.jso multicast.jso util.jso
		mkdir -p $(BUILD) && \
		cp $^ $(BUILD) && \
		cd $(BUILD) && \
		for file in *.jso; \
		do \
		  mv $$file `sed 's/\.jso/\.js/' <<<$$file`; \
		done

clean:
		rm -f *.jso

distclean:	clean
		rm -f $(BUILD)/*.js
