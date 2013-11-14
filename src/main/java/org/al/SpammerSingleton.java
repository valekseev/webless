package org.al;

public class SpammerSingleton implements Runnable {
    private static final SpammerSingleton SPAMMER = new SpammerSingleton();
	private SpammerSingleton() {}
	
	public static SpammerSingleton getInstance(){
		return SPAMMER;
	}
	
	@Override
	public void run() {
		
	}
}